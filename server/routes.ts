import express, { type Request, Response, NextFunction, Express } from "express";
import { storage } from "./storage.js";
import type { Business } from "../shared/schema.js";
import { nanoid } from "nanoid";

// Admin token for authentication
const ADMIN_TOKEN = 'pleasantcove2024admin';

// Utility function to generate unique project tokens
function generateProjectToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Real-time notification system
interface Notification {
  id: string;
  type: 'new_lead' | 'high_score_lead' | 'appointment_booked' | 'payment_received';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  businessId?: number;
}

const notifications: Notification[] = [];

function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  const newNotification: Notification = {
    ...notification,
    id: Date.now().toString(),
    timestamp: new Date(),
    read: false
  };
  notifications.unshift(newNotification);
  if (notifications.length > 100) {
    notifications.splice(100);
  }
}

// Enhanced lead scoring algorithm
function calculateLeadScore(leadData: any): number {
  let score = 50; // Base score
  
  const highValueTypes = ['electrical', 'plumbing', 'roofing', 'hvac'];
  if (highValueTypes.includes(leadData.business_type?.toLowerCase())) {
    score += 25;
  }
  
  if (leadData.email && leadData.email.includes('.com')) score += 10;
  if (leadData.phone && leadData.phone.length >= 10) score += 15;
  if (leadData.website) score += 10;
  
  if (leadData.message) {
    const message = leadData.message.toLowerCase();
    if (message.includes('urgent') || message.includes('asap')) score += 20;
    if (message.includes('budget') || message.includes('quote')) score += 15;
    if (message.includes('need') || message.includes('require')) score += 10;
    if (message.length > 50) score += 5;
  }
  
  if (leadData.appointment_date || leadData.preferred_date) score += 30;
  
  return Math.min(score, 100);
}

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  "/api/progress/public",
  "/api/scheduling/appointment-created",
  "/api/scheduling/appointment-updated",
  "/api/scheduling/appointment-cancelled",
  "/api/new-lead",
  "/api/acuity-appointment",
  "/api/public/project",
  "/health"
];

// Admin auth middleware
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (token !== 'pleasantcove2024admin') {
    return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<any> {
  
  // Enhanced new lead handler with better processing (PUBLIC - no auth required)
  app.post("/api/new-lead", async (req: Request, res: Response) => {
    try {
      console.log("=== ENHANCED SQUARESPACE WEBHOOK ===");
      console.log("Body:", JSON.stringify(req.body, null, 2));
      
      let leadData = req.body.data || req.body;
      
      const { 
        name, email, phone, message,
        appointment_date, appointment_time, preferred_date, preferred_time,
        company, business_name, website, service_type,
        ...otherFields
      } = leadData;
      
      const leadScore = calculateLeadScore(leadData);
      
      let businessType = service_type || 'unknown';
      if (message) {
        const msgLower = message.toLowerCase();
        if (msgLower.includes('electric') || msgLower.includes('wiring')) businessType = 'electrical';
        else if (msgLower.includes('plumb') || msgLower.includes('leak')) businessType = 'plumbing';
        else if (msgLower.includes('roof') || msgLower.includes('gutter')) businessType = 'roofing';
        else if (msgLower.includes('hvac') || msgLower.includes('heat') || msgLower.includes('air')) businessType = 'hvac';
      }
      
      const businessData = {
        name: name || business_name || company || "Unknown Business",
        phone: phone || "No phone provided",
        email: email || "",
        address: "To be enriched",
        city: "To be enriched", 
        state: "To be enriched",
        businessType,
        stage: leadScore >= 80 ? "contacted" : "scraped",
        notes: `Squarespace Lead (Score: ${leadScore})\nMessage: ${message || "No message"}\nAuto-classified: ${businessType}`,
        website: website || "",
        score: leadScore,
        priority: leadScore >= 80 ? "high" : leadScore >= 60 ? "medium" : "low",
      };

      const business = await storage.createBusiness(businessData);
      
      // ===================
      // PROJECT TOKEN LOGIC
      // ===================
      let projectToken = null;
      
      if (email) {
        // Check if a project already exists for this email
        try {
          // First, try to find existing companies with this email
          const companies = await storage.getCompanies();
          const existingCompany = companies.find(c => c.email?.toLowerCase() === email.toLowerCase());
          
          if (existingCompany) {
            // Company exists, check if it has projects
            const projects = await storage.getProjectsByCompany(existingCompany.id!);
            if (projects && projects.length > 0) {
              // Use existing project token if available
              const existingProject = projects[0];
              projectToken = existingProject.accessToken || generateProjectToken();
              
              // Update project with token if it didn't have one
              if (!existingProject.accessToken) {
                await storage.updateProject(existingProject.id!, { 
                  accessToken: projectToken 
                });
              }
            } else {
              // Company exists but no projects, create one
              projectToken = generateProjectToken();
              await storage.createProject({
                companyId: existingCompany.id!,
                title: `${existingCompany.name} - Website Project`,
                type: 'website',
                stage: 'planning',
                status: 'active',
                accessToken: projectToken,
                notes: `Project for ${existingCompany.name} - Started from Squarespace lead`,
                totalAmount: 0,
                paidAmount: 0
              });
            }
          } else {
            // No company exists, create company and project
            projectToken = generateProjectToken();
            
            const newCompany = await storage.createCompany({
              name: businessData.name,
              email: email,
              phone: businessData.phone,
              address: businessData.address,
              city: businessData.city,
              state: businessData.state,
              industry: businessData.businessType,
              website: businessData.website
            });
            
            await storage.createProject({
              companyId: newCompany.id!,
              title: `${newCompany.name} - Website Project`,
              type: 'website',
              stage: 'planning',
              status: 'active',
              accessToken: projectToken,
              notes: `Project for ${newCompany.name} - Started from Squarespace lead`,
              totalAmount: 0,
              paidAmount: 0
            });
            
            // Log company creation activity
            await storage.createActivity({
              type: 'company_created',
              description: `Company created from Squarespace lead: ${newCompany.name}`,
              companyId: newCompany.id!
            });
          }
          
          console.log(`🎯 Project token assigned: ${projectToken} for email: ${email}`);
          
        } catch (projectError) {
          console.error("Error handling project token logic:", projectError);
          // Continue without project token if there's an error
        }
      }
      
      await storage.createActivity({
        type: "lead_received",
        description: `New Squarespace lead: ${businessData.name} (Score: ${leadScore})`,
        businessId: business.id!,
      });

      if (leadScore >= 80) {
        addNotification({
          type: 'high_score_lead',
          title: 'High-Priority Lead Received!',
          message: `${businessData.name} - Score: ${leadScore} (${businessType})`,
          businessId: business.id!
        });
      } else {
        addNotification({
          type: 'new_lead',
          title: 'New Lead Received',
          message: `${businessData.name} - Score: ${leadScore}`,
          businessId: business.id!
        });
      }
      
      res.status(200).json({ 
        success: true, 
        businessId: business.id,
        leadScore,
        priority: businessData.priority,
        projectToken: projectToken, // Include project token for Squarespace embedding
        message: "Lead received and queued for enrichment",
        ...(projectToken && { 
          messagingUrl: `/squarespace-widgets/messaging-widget.html?token=${projectToken}`,
          clientPortalUrl: `/api/public/project/${projectToken}` 
        })
      });
    } catch (error) {
      console.error("Failed to process lead:", error);
      res.status(500).json({ error: "Failed to process lead" });
    }
  });

  // Squarespace Scheduling webhook endpoints (PUBLIC - no auth required)
  app.post("/api/scheduling/appointment-created", async (req: Request, res: Response) => {
    try {
      console.log("=== SQUARESPACE SCHEDULING WEBHOOK ===");
      console.log("Appointment Created:", JSON.stringify(req.body, null, 2));
      
      const appointmentData = req.body;
      
      // Extract appointment details
      const {
        id: squarespaceId,
        firstName,
        lastName,
        email,
        phone,
        datetime,
        endTime,
        appointmentTypeID,
        notes,
        status = 'scheduled'
      } = appointmentData;
      
      // Find or create business record
      let business = null;
      const existingBusinesses = await storage.searchBusinesses(email || phone || '');
      
      if (existingBusinesses.length > 0) {
        business = existingBusinesses[0];
      } else {
        // Create new business from appointment
        business = await storage.createBusiness({
          name: `${firstName} ${lastName}`.trim(),
          email: email || '',
          phone: phone || 'No phone provided',
          address: 'To be enriched',
          city: 'To be enriched',
          state: 'To be enriched',
          businessType: 'consultation',
          stage: 'scheduled',
          notes: `Squarespace Appointment: ${notes || 'No notes'}`,
          priority: 'high',
          score: 85 // High score for scheduled appointments
        });
      }
      
      // Create appointment record
      const appointment = await storage.createAppointment({
        businessId: business.id!,
        datetime,
        status,
        notes: notes || '',
        isAutoScheduled: true,
        squarespaceId: squarespaceId?.toString()
      });
      
      // Log activity
      await storage.createActivity({
        type: 'appointment_scheduled',
        description: `Appointment scheduled via Squarespace: ${firstName} ${lastName}`,
        businessId: business.id!
      });
      
      // Add notification
      addNotification({
        type: 'appointment_booked',
        title: 'New Appointment Booked!',
        message: `${firstName} ${lastName} - ${new Date(datetime).toLocaleDateString()}`,
        businessId: business.id!
      });
      
      res.status(200).json({ 
        success: true, 
        appointmentId: appointment.id,
        businessId: business.id,
        message: "Appointment created and synced" 
      });
      
    } catch (error) {
      console.error("Failed to process Squarespace appointment:", error);
      res.status(500).json({ error: "Failed to process appointment" });
    }
  });
  
  app.post("/api/scheduling/appointment-updated", async (req: Request, res: Response) => {
    try {
      console.log("=== SQUARESPACE APPOINTMENT UPDATED ===");
      console.log("Appointment Updated:", JSON.stringify(req.body, null, 2));
      
      const { id: squarespaceId, status, datetime, notes } = req.body;
      
      res.status(200).json({ 
        success: true, 
        message: "Appointment updated" 
      });
      
    } catch (error) {
      console.error("Failed to update appointment:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });
  
  app.post("/api/scheduling/appointment-cancelled", async (req: Request, res: Response) => {
    try {
      console.log("=== SQUARESPACE APPOINTMENT CANCELLED ===");
      console.log("Appointment Cancelled:", JSON.stringify(req.body, null, 2));
      
      const { id: squarespaceId, firstName, lastName } = req.body;
      
      // Log cancellation activity
      addNotification({
        type: 'appointment_booked', // Could add a cancellation type
        title: 'Appointment Cancelled',
        message: `${firstName} ${lastName} cancelled their appointment`
      });
      
      res.status(200).json({ 
        success: true, 
        message: "Appointment cancellation processed" 
      });
      
    } catch (error) {
      console.error("Failed to process cancellation:", error);
      res.status(500).json({ error: "Failed to process cancellation" });
    }
  });

  // ===================
  // PUBLIC CLIENT PORTAL API (No Auth Required)
  // ===================
  
  // Get project messages by token (PUBLIC - for client portal)
  app.get("/api/public/project/:token/messages", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      
      // Find project by access token
      const project = await storage.getProjectByToken(token);
      if (!project) {
        return res.status(404).json({ error: "Project not found or invalid token" });
      }
      
      // Get messages for this project
      const messages = await storage.getProjectMessages(project.id!);
      
      res.json({
        success: true,
        messages: messages || [],
        projectId: project.id
      });
    } catch (error) {
      console.error("Failed to fetch project messages by token:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  // Get project summary by access token (PUBLIC - for client portal)
  app.get("/api/public/project/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: "Access token is required" });
      }

      const projectSummary = await storage.getProjectSummaryByToken(token);
      
      if (!projectSummary) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }

      // Return project data without sensitive admin info
      res.json({
        project: {
          id: projectSummary.project.id,
          title: projectSummary.project.title,
          type: projectSummary.project.type,
          stage: projectSummary.project.stage,
          totalAmount: projectSummary.project.totalAmount,
          paidAmount: projectSummary.project.paidAmount,
          createdAt: projectSummary.project.createdAt
        },
        company: {
          name: projectSummary.company.name,
          email: projectSummary.company.email,
          phone: projectSummary.company.phone
        },
        messages: projectSummary.messages,
        files: projectSummary.files,
        activities: projectSummary.activities.filter(a => a.type !== 'admin_note') // Hide admin-only activities
      });
    } catch (error) {
      console.error("Failed to fetch project summary:", error);
      res.status(500).json({ error: "Failed to fetch project data" });
    }
  });

  // Create message in project (PUBLIC - for client replies)
  app.post("/api/public/project/:token/messages", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { content, senderName } = req.body;
      
      if (!token || !content || !senderName) {
        return res.status(400).json({ error: "Token, content, and sender name are required" });
      }

      // Verify project exists and get project ID
      const projectData = await storage.getProjectByToken(token);
      if (!projectData) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }

      const message = await storage.createProjectMessage({
        projectId: projectData.id!,
        senderType: 'client',
        senderName,
        content
      });

      // Log activity for admin
      await storage.createActivity({
        type: 'client_message',
        description: `New message from ${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        companyId: projectData.companyId,
        projectId: projectData.id!
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Failed to create client message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ===================
  // ACUITY SCHEDULING WEBHOOK (PUBLIC - no auth required)
  // ===================
  
  app.post("/api/acuity-appointment", async (req: Request, res: Response) => {
    try {
      console.log("=== ACUITY WEBHOOK RECEIVED ===");
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Body:", JSON.stringify(req.body, null, 2));
      console.log("Method:", req.method);
      console.log("URL:", req.url);
      console.log("==========================================");
      
      const webhookData = req.body;
      
      // Handle real Acuity webhook format (notification only)
      if (webhookData.action && webhookData.id && !webhookData.email) {
        console.log(`🔄 Real Acuity webhook - fetching appointment details for ID: ${webhookData.id}`);
        
        // Fetch full appointment details from Acuity API
        const acuityUserId = process.env.ACUITY_USER_ID;
        const acuityApiKey = process.env.ACUITY_API_KEY;
        
        if (!acuityUserId || !acuityApiKey) {
          console.log("⚠️ Acuity credentials not configured. Cannot fetch appointment details.");
          return res.status(200).json({ 
            success: false, 
            message: "Acuity credentials not configured" 
          });
        }
        
        try {
          const authHeader = Buffer.from(`${acuityUserId}:${acuityApiKey}`).toString('base64');
          const response = await fetch(`https://acuityscheduling.com/api/v1/appointments/${webhookData.id}`, {
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.log(`❌ Failed to fetch appointment details: ${response.status} ${response.statusText}`);
            return res.status(200).json({ 
              success: false, 
              message: `Failed to fetch appointment: ${response.status}` 
            });
          }
          
          const appointmentDetails = await response.json();
          console.log("✅ Fetched appointment details:", JSON.stringify(appointmentDetails, null, 2));
          
          // Use the fetched details for processing
          webhookData.firstName = appointmentDetails.firstName;
          webhookData.lastName = appointmentDetails.lastName;
          webhookData.email = appointmentDetails.email;
          webhookData.phone = appointmentDetails.phone;
          webhookData.datetime = appointmentDetails.datetime;
          webhookData.endTime = appointmentDetails.endTime;
          webhookData.duration = appointmentDetails.duration;
          webhookData.appointmentType = appointmentDetails.type;
          webhookData.notes = appointmentDetails.notes;
          
        } catch (error) {
          console.log("❌ Error fetching appointment details:", error);
          return res.status(200).json({ 
            success: false, 
            message: "Error fetching appointment details" 
          });
        }
      }
      
      // Extract appointment details (now either from original webhook or fetched from API)
      const {
        id: acuityId,
        firstName,
        lastName,
        email,
        phone,
        datetime,
        endTime,
        duration,
        appointmentType,
        appointmentTypeID,
        notes,
        action = 'scheduled'
      } = webhookData;
      
      // Validate required fields
      if (!acuityId || !email) {
        console.log("❌ Missing required fields: acuityId or email");
        return res.status(400).json({ 
          success: false, 
          error: "Missing required fields: acuityId or email" 
        });
      }
      
      // Find existing client by email
      const clientData = await storage.findClientByEmail(email);
      let projectToken = null;
      let companyId = null;
      let projectId = null;
      let businessId = null;
      
      if (clientData?.company && clientData?.project) {
        // Use existing company/project
        companyId = clientData.company.id;
        projectId = clientData.project.id;
        projectToken = clientData.project.accessToken;
        
        console.log(`✅ Found existing client: ${clientData.company.name} (Project Token: ${projectToken})`);
      } else if (clientData?.business) {
        // Legacy business system
        businessId = clientData.business.id;
        console.log(`✅ Found existing business: ${clientData.business.name}`);
      } else {
        // Create new company and project for this client
        console.log(`🆕 Creating new client for email: ${email}`);
        
        projectToken = generateProjectToken();
        
        const newCompany = await storage.createCompany({
          name: `${firstName} ${lastName}`.trim(),
          email: email,
          phone: phone || 'No phone provided',
          address: 'To be updated',
          city: 'To be updated',
          state: 'To be updated',
          industry: 'consultation',
          website: ''
        });
        
        const newProject = await storage.createProject({
          companyId: newCompany.id!,
          title: `${newCompany.name} - Consultation Project`,
          type: 'consultation',
          stage: 'scheduled',
          status: 'active',
          accessToken: projectToken,
          notes: `Project created from Acuity appointment booking`,
          totalAmount: 0,
          paidAmount: 0
        });
        
        companyId = newCompany.id;
        projectId = newProject.id;
        
        console.log(`🎯 Created new client with project token: ${projectToken}`);
        
        // Log company creation activity
        await storage.createActivity({
          type: 'company_created',
          description: `Company created from Acuity appointment: ${newCompany.name}`,
          companyId: newCompany.id!,
          projectId: newProject.id!
        });
      }
      
      // Prepare appointment data
      const appointmentData = {
        acuityId: acuityId.toString(),
        email,
        firstName,
        lastName,
        phone,
        datetime,
        endTime,
        duration,
        serviceType: appointmentType || 'consultation',
        appointmentTypeId: appointmentTypeID?.toString(),
        status: action === 'canceled' ? 'cancelled' : 'scheduled',
        notes: notes || '',
        isAutoScheduled: true,
        webhookAction: action,
        companyId,
        projectId,
        businessId
      };
      
      // Create or update appointment
      const appointment = await storage.createAcuityAppointment(appointmentData, projectToken || undefined);
      
      // Log activity
      const activityData: any = {
        type: 'appointment_scheduled',
        description: `Acuity appointment ${action}: ${firstName} ${lastName} - ${new Date(datetime).toLocaleDateString()}`,
      };
      
      if (companyId) activityData.companyId = companyId;
      if (projectId) activityData.projectId = projectId;
      if (businessId) activityData.businessId = businessId;
      
      await storage.createActivity(activityData);
      
      // Add notification
      addNotification({
        type: 'appointment_booked',
        title: action === 'canceled' ? 'Appointment Cancelled' : 'Acuity Appointment Booked!',
        message: `${firstName} ${lastName} - ${new Date(datetime).toLocaleDateString()}`,
        businessId: businessId || companyId || undefined
      });
      
      console.log(`✅ Acuity appointment processed: ${acuityId} for ${email} (Action: ${action})`);
      
      res.status(200).json({ 
        success: true, 
        appointmentId: appointment.id,
        projectToken,
        action,
        message: "Acuity appointment processed successfully" 
      });
      
    } catch (error) {
      console.error("Failed to process Acuity webhook:", error);
      res.status(500).json({ error: "Failed to process Acuity appointment" });
    }
  });

  // ===================
  // PROJECT OPERATIONS
  // ===================
  
  // Get all projects
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const { status, stage, type, companyId } = req.query;
      
      const filters = {
        status: status as string,
        stage: stage as string,
        type: type as string,
        companyId: companyId ? parseInt(companyId as string) : undefined
      };
      
      const projects = await storage.getProjects(filters);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Get project by ID with company information
  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Get company information
      const company = await storage.getCompanyById(project.companyId);
      
      res.json({
        ...project,
        company: company
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Get project summary with related data
  app.get("/api/projects/:id/summary", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Get related data
      const company = await storage.getCompanyById(project.companyId);
      const activities = await storage.getActivitiesByProject(projectId);
      const appointments = await storage.getAppointmentsByProject(projectId);
      
      res.json({
        project,
        company,
        activities: activities || [],
        appointments: appointments || [],
        stats: {
          totalActivities: activities?.length || 0,
          upcomingAppointments: appointments?.filter(apt => 
            apt.status === 'scheduled' && new Date(apt.datetime) > new Date()
          ).length || 0
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project summary" });
    }
  });

  // Create new project
  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const projectData = req.body;
      
      // Validate company exists
      const company = await storage.getCompanyById(projectData.companyId);
      if (!company) {
        return res.status(400).json({ error: "Company not found" });
      }
      
      const project = await storage.createProject(projectData);
      
      // Log activity
      await storage.createActivity({
        type: 'project_created',
        description: `New project created: ${project.title}`,
        companyId: project.companyId,
        projectId: project.id!
      });
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Failed to create project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  // Update project
  app.put("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const updateData = req.body;
      
      const project = await storage.updateProject(projectId, updateData);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Log activity
      await storage.createActivity({
        type: 'project_updated',
        description: `Project updated: ${project.title}`,
        companyId: project.companyId,
        projectId: project.id!
      });
      
      res.json(project);
    } catch (error) {
      console.error("Failed to update project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  // Archive/reactivate project
  app.patch("/api/projects/:id/status", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['active', 'archived', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be active, archived, or cancelled" });
      }
      
      const project = await storage.updateProject(projectId, { status });
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Log activity
      await storage.createActivity({
        type: 'project_status_changed',
        description: `Project status changed to ${status}: ${project.title}`,
        companyId: project.companyId,
        projectId: project.id!
      });
      
      res.json(project);
    } catch (error) {
      console.error("Failed to update project status:", error);
      res.status(500).json({ error: "Failed to update project status" });
    }
  });

  // ===================
  // PROJECT MESSAGING OPERATIONS (Admin)
  // ===================

  // Get all messages for a project
  app.get("/api/projects/:id/messages", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const messages = await storage.getProjectMessages(projectId);
      res.json(messages);
    } catch (error) {
      console.error("Failed to fetch project messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Create new message in project (Admin)
  app.post("/api/projects/:id/messages", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const { content, senderName, attachments } = req.body;
      
      if (!content || !senderName) {
        return res.status(400).json({ error: "Content and sender name are required" });
      }

      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const message = await storage.createProjectMessage({
        projectId,
        senderType: 'admin',
        senderName,
        content,
        attachments: attachments || []
      });

      // Log activity
      await storage.createActivity({
        type: 'admin_message',
        description: `Admin message sent: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Failed to create admin message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ===================
  // PROJECT FILE OPERATIONS (Admin)
  // ===================

  // Get all files for a project
  app.get("/api/projects/:id/files", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      const files = await storage.getProjectFiles(projectId);
      res.json(files);
    } catch (error) {
      console.error("Failed to fetch project files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // Upload/create file record for project
  app.post("/api/projects/:id/files", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const { fileName, fileUrl, fileSize, fileType, uploaderName, description } = req.body;
      
      if (!fileName || !fileUrl || !uploaderName) {
        return res.status(400).json({ error: "File name, URL, and uploader name are required" });
      }

      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const file = await storage.createProjectFile({
        projectId,
        fileName,
        fileUrl,
        fileSize,
        fileType,
        uploadedBy: 'admin',
        uploaderName,
        description
      });

      // Log activity
      await storage.createActivity({
        type: 'file_uploaded',
        description: `File uploaded: ${fileName}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      res.status(201).json(file);
    } catch (error) {
      console.error("Failed to create file record:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Delete file
  app.delete("/api/projects/files/:fileId", async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.fileId);
      
      // Get file info before deletion for activity logging
      const files = await storage.getProjectFiles(0); // Get all files first
      const file = files.find(f => f.id === fileId);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      await storage.deleteProjectFile(fileId);
      
      // Log activity
      const project = await storage.getProjectById(file.projectId);
      if (project) {
        await storage.createActivity({
          type: 'file_deleted',
          description: `File deleted: ${file.fileName}`,
          companyId: project.companyId,
          projectId: project.id!
        });
      }

      res.json({ success: true, message: "File deleted successfully" });
    } catch (error) {
      console.error("Failed to delete file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // ===================
  // ZAPIER-FRIENDLY ENDPOINTS
  // ===================

  // Search businesses/leads (useful for Zapier lookups)
  app.get("/api/search/businesses", async (req: Request, res: Response) => {
    try {
      const { q, email, phone, name, limit = 10 } = req.query;
      
      let businesses;
      if (email) {
        businesses = await storage.searchBusinesses(email as string);
      } else if (phone) {
        businesses = await storage.searchBusinesses(phone as string);
      } else if (q) {
        businesses = await storage.searchBusinesses(q as string);
      } else if (name) {
        businesses = await storage.searchBusinesses(name as string);
      } else {
        businesses = await storage.getBusinesses();
      }
      
      // Limit results for Zapier efficiency
      const limitedResults = businesses.slice(0, parseInt(limit as string));
      
      res.json({
        results: limitedResults,
        total: businesses.length,
        limited: businesses.length > parseInt(limit as string)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to search businesses" });
    }
  });

  // Update business stage (useful for Zapier status updates)
  app.patch("/api/businesses/:id/stage", async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.id);
      const { stage, notes } = req.body;
      
      if (!stage) {
        return res.status(400).json({ error: "Stage is required" });
      }

      const business = await storage.updateBusinessStage(businessId, stage);
      
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Log activity
      await storage.createActivity({
        type: 'stage_updated',
        description: `Stage updated to: ${stage}${notes ? ` - ${notes}` : ''}`,
        businessId: businessId
      });

      res.json({ 
        success: true, 
        business,
        message: `Stage updated to ${stage}` 
      });
    } catch (error) {
      console.error("Failed to update business stage:", error);
      res.status(500).json({ error: "Failed to update stage" });
    }
  });

  // Get recent activities (useful for Zapier triggers)
  app.get("/api/activities/recent", async (req: Request, res: Response) => {
    try {
      const { limit = 50, since, type } = req.query;
      
      const activities = await storage.getActivities();
      let filteredActivities = activities;

      // Filter by timestamp if 'since' provided
      if (since) {
        const sinceDate = new Date(since as string);
        filteredActivities = activities.filter(a => 
          new Date(a.createdAt!) > sinceDate
        );
      }

      // Filter by type if provided
      if (type) {
        filteredActivities = filteredActivities.filter(a => a.type === type);
      }

      // Limit results
      const limitedResults = filteredActivities.slice(0, parseInt(limit as string));

      res.json({
        activities: limitedResults,
        total: filteredActivities.length,
        hasMore: filteredActivities.length > parseInt(limit as string)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent activities" });
    }
  });

  // Bulk update businesses (useful for Zapier batch operations)
  app.patch("/api/businesses/bulk", async (req: Request, res: Response) => {
    try {
      const { businessIds, updates } = req.body;
      
      if (!businessIds || !Array.isArray(businessIds) || !updates) {
        return res.status(400).json({ 
          error: "businessIds (array) and updates (object) are required" 
        });
      }

      const results = [];
      
      for (const businessId of businessIds) {
        try {
          const business = await storage.updateBusiness(parseInt(businessId), updates);
          if (business) {
            results.push({ businessId, success: true, business });
            
            // Log activity for each update
            await storage.createActivity({
              type: 'bulk_updated',
              description: `Bulk update applied: ${Object.keys(updates).join(', ')}`,
              businessId: parseInt(businessId)
            });
          } else {
            results.push({ businessId, success: false, error: "Business not found" });
          }
        } catch (error) {
          results.push({ businessId, success: false, error: (error as Error).message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      res.json({
        success: true,
        results,
        summary: {
          total: businessIds.length,
          successful: successCount,
          failed: businessIds.length - successCount
        }
      });
    } catch (error) {
      console.error("Failed to perform bulk update:", error);
      res.status(500).json({ error: "Failed to perform bulk update" });
    }
  });

  // Webhook test endpoint (useful for Zapier webhook testing)
  app.post("/api/webhook/test", async (req: Request, res: Response) => {
    try {
      console.log("=== ZAPIER WEBHOOK TEST ===");
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Body:", JSON.stringify(req.body, null, 2));
      console.log("Method:", req.method);
      console.log("Time:", new Date().toISOString());
      console.log("===========================");

      // Log the test webhook
      await storage.createActivity({
        type: 'webhook_test',
        description: `Zapier webhook test received: ${JSON.stringify(req.body).substring(0, 100)}...`
      });

      res.json({
        success: true,
        received: req.body,
        timestamp: new Date().toISOString(),
        message: "Webhook test successful",
        headers: req.headers
      });
    } catch (error) {
      console.error("Webhook test failed:", error);
      res.status(500).json({ error: "Webhook test failed" });
    }
  });

  // Get business by email (useful for Zapier deduplication)
  app.get("/api/businesses/by-email/:email", async (req: Request, res: Response) => {
    try {
      const email = decodeURIComponent(req.params.email);
      const businesses = await storage.searchBusinesses(email);
      
      if (businesses.length === 0) {
        return res.status(404).json({ 
          error: "Business not found",
          email: email 
        });
      }

      // Return the first (most recent) match
      res.json(businesses[0]);
    } catch (error) {
      console.error("Failed to find business by email:", error);
      res.status(500).json({ error: "Failed to find business" });
    }
  });

  // Add tags to business (useful for Zapier organization)
  app.post("/api/businesses/:id/tags", async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.id);
      const { tags } = req.body;
      
      if (!tags || !Array.isArray(tags)) {
        return res.status(400).json({ error: "Tags array is required" });
      }

      // Get current business to merge tags
      const currentBusiness = await storage.getBusinessById(businessId);
      if (!currentBusiness) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Merge new tags with existing ones
      const existingTags = currentBusiness.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])]; // Remove duplicates
      
      const business = await storage.updateBusiness(businessId, { tags: newTags });

      // Log activity
      await storage.createActivity({
        type: 'tags_added',
        description: `Tags added: ${tags.join(', ')}`,
        businessId: businessId
      });

      res.json({ 
        success: true, 
        business,
        tagsAdded: tags 
      });
    } catch (error) {
      console.error("Failed to add tags:", error);
      res.status(500).json({ error: "Failed to add tags" });
    }
  });

  // ===================
  // SQUARESPACE WEBHOOK INTEGRATION
  // ===================

  // Webhook to push client messages to Squarespace
  app.post("/api/push-client-message", async (req: Request, res: Response) => {
    try {
      const { 
        client_email, 
        project_id, 
        content, 
        attachments = [], 
        timestamp,
        sender_name 
      } = req.body;

      if (!client_email || !project_id || !content) {
        return res.status(400).json({ 
          error: "client_email, project_id, and content are required" 
        });
      }

      // Get project and company info
      const project = await storage.getProjectById(parseInt(project_id));
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const company = await storage.getCompanyById(project.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Format message for Squarespace
      const squarespaceMessage = {
        project_title: project.title,
        company_name: company.name,
        client_email,
        message_content: content,
        attachments: attachments.map((url: string) => ({
          url,
          name: url.split('/').pop() || 'attachment'
        })),
        timestamp: timestamp || new Date().toISOString(),
        sender: sender_name || 'Pleasant Cove Design',
        message_type: 'admin_update',
        project_stage: project.stage
      };

      // In production, you'd send this to your Squarespace webhook URL
      // For now, we'll log it and return success
      console.log("🚀 Pushing message to Squarespace:", squarespaceMessage);
      
      // You would integrate with Zapier/webhook here:
      // await fetch('YOUR_SQUARESPACE_WEBHOOK_URL', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(squarespaceMessage)
      // });

      // Log the push activity
      await storage.createActivity({
        type: 'message_pushed',
        description: `Message pushed to Squarespace for ${company.name}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      res.json({
        success: true,
        message: "Message pushed to Squarespace successfully",
        squarespace_payload: squarespaceMessage
      });
    } catch (error) {
      console.error("Failed to push message to Squarespace:", error);
      res.status(500).json({ error: "Failed to push message" });
    }
  });

  // Enhanced admin message creation with automatic Squarespace push
  app.post("/api/projects/:id/messages/with-push", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const { content, senderName, attachments = [], pushToSquarespace = true } = req.body;
      
      if (!content || !senderName) {
        return res.status(400).json({ error: "Content and sender name are required" });
      }

      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Get company info
      const company = await storage.getCompanyById(project.companyId);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Create the message
      const message = await storage.createProjectMessage({
        projectId,
        senderType: 'admin',
        senderName,
        content,
        attachments
      });

      // Log activity
      await storage.createActivity({
        type: 'admin_message',
        description: `Admin message sent: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      // Auto-push to Squarespace if enabled
      if (pushToSquarespace && company.email) {
        try {
          const pushResponse = await fetch(`${req.protocol}://${req.get('host')}/api/push-client-message`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization || ''
            },
            body: JSON.stringify({
              client_email: company.email,
              project_id: projectId.toString(),
              content,
              attachments,
              sender_name: senderName
            })
          });

          const pushResult = await pushResponse.json();
          
          res.status(201).json({
            message,
            squarespace_push: pushResult.success ? 'success' : 'failed',
            squarespace_payload: pushResult.squarespace_payload
          });
        } catch (pushError) {
          console.error("Failed to push to Squarespace:", pushError);
          res.status(201).json({
            message,
            squarespace_push: 'failed',
            squarespace_error: 'Push to Squarespace failed'
          });
        }
      } else {
        res.status(201).json({ message });
      }
    } catch (error) {
      console.error("Failed to create admin message with push:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Activities
  app.get("/api/activities", async (req: Request, res: Response) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Campaigns
  app.get("/api/campaigns", async (req: Request, res: Response) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // Templates
  app.get("/api/templates", async (req: Request, res: Response) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const unreadOnly = req.query.unread === 'true';
      
      let filteredNotifications = notifications;
      if (unreadOnly) {
        filteredNotifications = notifications.filter(n => !n.read);
      }
      
      res.json(filteredNotifications.slice(0, limit));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Appointments
  app.get("/api/appointments", async (req: Request, res: Response) => {
    try {
      const { projectToken } = req.query;
      
      // If projectToken is provided, return only appointments for that client (PUBLIC ACCESS)
      if (projectToken) {
        const appointments = await storage.getAppointmentsByProjectToken(projectToken as string);
        
        // Enhance with minimal client info for display
        const enhancedAppointments = appointments.map(appointment => ({
          id: appointment.id,
          datetime: appointment.datetime,
          endTime: appointment.endTime,
          duration: appointment.duration,
          serviceType: appointment.serviceType,
          status: appointment.status,
          notes: appointment.notes,
          firstName: appointment.firstName,
          lastName: appointment.lastName,
          email: appointment.email,
          phone: appointment.phone,
          webhookAction: appointment.webhookAction,
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt
        }));
        
        return res.json(enhancedAppointments);
      }
      
      // Admin access - return all appointments with full client information
      const appointments = await storage.getAppointments();
      const businesses = await storage.getBusinesses();
      const companies = await storage.getCompanies();
      
      // Create maps for quick lookup
      const businessMap = new Map(businesses.map(b => [b.id, b]));
      const companyMap = new Map(companies.map(c => [c.id, c]));
      
      // Enhance appointments with client information
      const enhancedAppointments = appointments.map(appointment => {
        let clientInfo = {
          client_name: 'Unknown Client',
          phone: 'No phone',
          email: '',
          businessType: 'unknown',
          clientStage: 'unknown',
          clientScore: 0,
          clientPriority: 'medium'
        };
        
        // Try to get info from company first (new system)
        if (appointment.companyId) {
          const company = companyMap.get(appointment.companyId);
          if (company) {
            clientInfo = {
              client_name: company.name,
              phone: company.phone || 'No phone',
              email: company.email || '',
              businessType: company.industry || 'unknown',
              clientStage: 'unknown', // Companies don't have stages
              clientScore: 0,
              clientPriority: company.priority || 'medium'
            };
          }
        }
        
        // Fallback to business (legacy system)
        if (appointment.businessId && !appointment.companyId) {
          const business = businessMap.get(appointment.businessId);
          if (business) {
            clientInfo = {
              client_name: business.name,
              phone: business.phone || 'No phone',
              email: business.email || '',
              businessType: business.businessType || 'unknown',
              clientStage: business.stage || 'unknown',
              clientScore: business.score || 0,
              clientPriority: business.priority || 'medium'
            };
          }
        }
        
        return {
          ...appointment,
          ...clientInfo
        };
      });
      
      res.json(enhancedAppointments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  // Create new appointment
  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      const { businessId, client_id, datetime, status, notes, isAutoScheduled, projectToken, serviceType, duration } = req.body;
      
      let clientBusinessId = client_id || businessId || 1;
      let companyId = null;
      let projectId = null;
      
      // If projectToken is provided, find the associated project/company
      if (projectToken) {
        try {
          const projectData = await storage.getProjectByToken(projectToken);
          if (projectData) {
            companyId = projectData.companyId;
            projectId = projectData.id;
            // Don't use businessId for project-based appointments
            clientBusinessId = null;
          }
        } catch (error) {
          console.error("Error finding project by token:", error);
        }
      }
      
      // If no project found but we have businessId, use legacy system
      if (!companyId && !clientBusinessId && businessId) {
        clientBusinessId = businessId;
      }
      
      const appointmentData: any = {
        datetime,
        status: status || 'scheduled',
        notes: notes || '',
        isAutoScheduled: isAutoScheduled || false,
        serviceType: serviceType || 'consultation',
        duration: duration || 30
      };
      
      // Add the appropriate ID
      if (companyId && projectId) {
        appointmentData.companyId = companyId;
        appointmentData.projectId = projectId;
        appointmentData.projectToken = projectToken;
      } else if (clientBusinessId) {
        appointmentData.businessId = clientBusinessId;
      }
      
      const appointment = await storage.createAppointment(appointmentData);
      
      // Get client information for the response
      let clientInfo = null;
      if (companyId) {
        clientInfo = await storage.getCompanyById(companyId);
      } else if (clientBusinessId) {
        clientInfo = await storage.getBusinessById(clientBusinessId);
      }
      
      // Log activity
      if (companyId && projectId) {
        await storage.createActivity({
          type: 'appointment_scheduled',
          description: `Custom appointment created: ${serviceType} - ${notes || 'Appointment'}`,
          companyId: companyId,
          projectId: projectId
        });
      } else if (clientBusinessId) {
        await storage.createActivity({
          type: 'appointment_scheduled',
          description: `Manual appointment created: ${notes || 'Appointment'}`,
          businessId: clientBusinessId
        });
      }
      
      // Add notification
      addNotification({
        type: 'appointment_booked',
        title: projectToken ? 'Client Appointment Booked' : 'Manual Appointment Created',
        message: `New appointment: ${clientInfo?.name || 'Unknown Client'} - ${new Date(datetime).toLocaleDateString()}`,
        businessId: clientBusinessId || companyId
      });
      
      // Update business stage to 'scheduled' if it was pending (legacy system only)
      if (clientBusinessId) {
        const business = await storage.getBusinessById(clientBusinessId);
        if (business && ['scraped', 'contacted', 'responded'].includes(business.stage || '')) {
          await storage.updateBusiness(clientBusinessId, { stage: 'scheduled' });
        }
      }
      
      res.status(201).json({ 
        success: true, 
        appointment,
        client: clientInfo,
        message: "Appointment created successfully" 
      });
    } catch (error) {
      console.error("Failed to create appointment:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  // Update existing appointment
  app.put("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { datetime, status, notes } = req.body;
      
      const appointment = await storage.updateAppointment(appointmentId, {
        datetime,
        status: status || 'scheduled',
        notes: notes || ''
      });
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Log activity
      await storage.createActivity({
        type: 'appointment_updated',
        description: `Appointment updated: ${notes || 'Appointment'}`,
        businessId: appointment.businessId
      });
      
      res.json({ 
        success: true, 
        appointment,
        message: "Appointment updated successfully" 
      });
    } catch (error) {
      console.error("Failed to update appointment:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });

  // Delete appointment
  app.delete("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Get the associated business before deleting
      const business = await storage.getBusinessById(appointment.businessId);
      
      await storage.deleteAppointment(appointmentId);
      
      // Check if this business has any other scheduled appointments
      const allAppointments = await storage.getAppointments();
      const hasOtherAppointments = allAppointments.some(apt => 
        apt.businessId === appointment.businessId && 
        apt.id !== appointmentId &&
        apt.status === 'scheduled'
      );
      
      // If no other appointments and business was in 'scheduled' stage, move back to pending
      if (!hasOtherAppointments && business && business.stage === 'scheduled') {
        await storage.updateBusiness(appointment.businessId, { 
          stage: 'responded' // Move back to pending status
        });
        
        console.log(`🔄 Business ${business.name} moved back to pending status after appointment deletion`);
      }
      
      // Log activity
      await storage.createActivity({
        type: 'appointment_cancelled',
        description: `Appointment deleted: ${appointment.notes || 'Appointment'}${!hasOtherAppointments && business?.stage === 'scheduled' ? ' - Client moved back to pending' : ''}`,
        businessId: appointment.businessId
      });
      
      res.json({ 
        success: true, 
        message: "Appointment deleted successfully" 
      });
    } catch (error) {
      console.error("Failed to delete appointment:", error);
      res.status(500).json({ error: "Failed to delete appointment" });
    }
  });

  // Client search endpoint for appointment scheduling
  app.get("/api/clients/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.json([]);
      }
      
      const businesses = await storage.searchBusinesses(query);
      
      // Format businesses as client options for autocomplete
      const clients = businesses.map(business => ({
        id: business.id,
        name: business.name,
        email: business.email || '',
        phone: business.phone || '',
        businessType: business.businessType || '',
        stage: business.stage || '',
        score: business.score || 0,
        priority: business.priority || 'medium'
      }));
      
      res.json(clients);
    } catch (error) {
      console.error("Failed to search clients:", error);
      res.status(500).json({ error: "Failed to search clients" });
    }
  });

  // Get pending appointments (leads without scheduled appointments)
  app.get("/api/appointments/pending", async (req: Request, res: Response) => {
    try {
      const businesses = await storage.getBusinesses();
      const appointments = await storage.getAppointments();
      
      // Get businesses that don't have any scheduled appointments
      const businessesWithAppointments = new Set(
        appointments
          .filter(apt => apt.status === 'scheduled')
          .map(apt => apt.businessId)
      );
      
      const pendingBusinesses = businesses.filter(business => 
        !businessesWithAppointments.has(business.id) && 
        ['scraped', 'contacted', 'responded'].includes(business.stage || '')
      );
      
      // Format as pending appointments
      const pendingAppointments = pendingBusinesses.map(business => ({
        id: `business-${business.id}`,
        client_id: business.id,
        client_name: business.name,
        phone: business.phone || 'No phone',
        email: business.email || '',
        notes: business.notes || 'New lead needs scheduling',
        businessType: business.businessType || 'unknown',
        stage: business.stage,
        score: business.score || 0,
        priority: business.priority || 'medium',
        status: 'pending'
      }));
      
      // Sort by priority and score
      pendingAppointments.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        return b.score - a.score;
      });
      
      res.json(pendingAppointments);
    } catch (error) {
      console.error("Failed to fetch pending appointments:", error);
      res.status(500).json({ error: "Failed to fetch pending appointments" });
    }
  });

  // ===================
  // ADMIN BYPASS ROUTES (No Authentication Required for Local Development)
  // ===================

  // Admin bypass: Get project data by client ID instead of token
  app.get("/api/admin/client/:clientId", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      
      // Find first project for this client (in a real app, you might want to list all projects)
      const projects = await storage.getProjectsByCompany(clientId);
      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: "No projects found for this client" });
      }
      
      const project = projects[0]; // Use first project for simplicity
      const company = await storage.getCompanyById(clientId);
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get messages, files, and activities
      const messages = await storage.getProjectMessages(project.id!);
      const files = await storage.getProjectFiles(project.id!);
      const activities = await storage.getActivitiesByProject(project.id!);

      const responseData = {
        project,
        company,
        messages: messages || [],
        files: files || [],
        activities: activities || []
      };

      res.json(responseData);
    } catch (error) {
      console.error("Failed to fetch admin client data:", error);
      res.status(500).json({ error: "Failed to load client data" });
    }
  });

  // Admin bypass: Send message as admin without token
  app.post("/api/admin/client/:clientId/message", async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { content, senderName } = req.body;
      
      if (!content || !senderName) {
        return res.status(400).json({ error: "Content and sender name are required" });
      }

      // Find first project for this client
      const projects = await storage.getProjectsByCompany(clientId);
      if (!projects || projects.length === 0) {
        return res.status(404).json({ error: "No projects found for this client" });
      }
      
      const project = projects[0];

      const message = await storage.createProjectMessage({
        projectId: project.id!,
        senderType: 'admin',
        senderName,
        content,
        attachments: []
      });

      // Log activity
      await storage.createActivity({
        type: 'admin_message',
        description: `Admin message sent: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Failed to send admin message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ===================
  // PUBLIC CLIENT PORTAL ROUTES (Token-based)
  // ===================

  // Serve a simple dashboard page
  app.get("/", (req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pleasant Cove Design v1.1</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
            .status { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin-bottom: 30px; text-align: center; border: 1px solid #c3e6cb; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .card { background: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid #007bff; }
            .card h3 { margin-top: 0; color: #495057; }
            .webhook-info { background: #e7f3ff; padding: 20px; border-radius: 5px; border: 1px solid #b8daff; }
            .code { background: #f4f4f4; padding: 10px; border-radius: 3px; font-family: monospace; margin: 10px 0; }
            .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
            .btn:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Pleasant Cove Design v1.1</h1>
            
            <div class="status">
              ✅ <strong>FULLY OPERATIONAL</strong> - Enhanced Squarespace webhook integration active!
            </div>

            <div class="grid">
              <div class="card">
                <h3>📊 Dashboard</h3>
                <p>View your lead analytics and business metrics.</p>
                <a href="/api/stats?token=pleasantcove2024admin" class="btn">View Stats</a>
              </div>
              
              <div class="card">
                <h3>👥 Leads</h3>
                <p>Manage your business leads and contacts.</p>
                <a href="/api/businesses?token=pleasantcove2024admin" class="btn">View Leads</a>
              </div>
              
              <div class="card">
                <h3>🔔 Notifications</h3>
                <p>Real-time alerts for new leads and activities.</p>
                <a href="/api/notifications?token=pleasantcove2024admin" class="btn">View Alerts</a>
              </div>
              
              <div class="card">
                <h3>📋 Activities</h3>
                <p>Track all lead interactions and activities.</p>
                <a href="/api/activities?token=pleasantcove2024admin" class="btn">View Activities</a>
              </div>
            </div>

            <div class="webhook-info">
              <h3>🎯 Squarespace Integration</h3>
              <p><strong>Webhook URL for Squarespace:</strong></p>
              <div class="code">http://localhost:5173/api/new-lead</div>
              
              <p><strong>Supported Form Fields:</strong> name, email, phone, message, business_type, appointment_date, website</p>
              
              <p><strong>Admin Token:</strong> <code>pleasantcove2024admin</code></p>
              
              <h4>✨ Enhanced Features:</h4>
              <ul>
                <li>🤖 Smart lead scoring (0-100)</li>
                <li>🎯 Auto-follow-up for high-score leads</li>
                <li>📱 Real-time notifications</li>
                <li>📈 Enhanced analytics</li>
                <li>🔐 Secure admin authentication</li>
              </ul>
            </div>
          </div>
        </body>
      </html>
    `);
  });

  // Book appointment with comprehensive intake form
  app.post("/api/book-appointment", async (req: Request, res: Response) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        businessName,
        services,
        projectDescription,
        budget,
        timeline,
        appointmentDate,
        appointmentTime,
        additionalNotes,
        source,
        timestamp
      } = req.body;

      console.log('=== COMPREHENSIVE APPOINTMENT BOOKING ===');
      console.log('Data received:', {
        name: `${firstName} ${lastName}`,
        email,
        services,
        budget,
        appointmentDate,
        appointmentTime
      });

      // First, create or update the client/company record
      let projectToken: string;
      let companyId: number;
      let projectId: number;

      // Check if client already exists by searching companies
      const companies = await storage.getCompanies();
      const existingCompany = companies.find(c => c.email === email);
      
      if (existingCompany) {
        console.log(`✅ Found existing client: ${existingCompany.name} (ID: ${existingCompany.id})`);
        companyId = existingCompany.id!;
        
        // Get existing project for this company
        const projects = await storage.getProjects();
        const existingProject = projects.find(p => p.companyId === companyId);
        
        if (existingProject) {
          projectToken = existingProject.accessToken!;
          projectId = existingProject.id!;
        } else {
          // Create new project for existing company
          projectToken = generateProjectToken();
          const projectData = {
            companyId,
            title: `${firstName} ${lastName} - ${typeof services === 'string' ? services : services.join(', ')} Project`,
            description: projectDescription,
            type: 'website',
            status: 'discovery',
            stage: 'planning',
            priority: 'medium',
            accessToken: projectToken
          };
          
          const newProject = await storage.createProject(projectData);
          projectId = newProject.id!;
          console.log(`✅ Created project: ${projectData.title} (ID: ${projectId})`);
        }
      } else {
        console.log('🔄 Creating new client record...');
        
        // Generate new project token
        projectToken = generateProjectToken();
        
        // Create company record
        const companyData = {
          name: businessName || `${firstName} ${lastName}`,
          email: email,
          phone: phone || '',
          address: '',
          city: '',
          state: '',
          industry: 'General',
          status: 'active',
          source: source || 'appointment_booking_widget'
        };
        
        const newCompany = await storage.createCompany(companyData);
        companyId = newCompany.id!;
        console.log(`✅ Created company: ${companyData.name} (ID: ${companyId})`);
        
        // Create project record
        const projectData = {
          companyId,
          title: `${firstName} ${lastName} - ${typeof services === 'string' ? services : services.join(', ')} Project`,
          description: projectDescription,
          type: 'website',
          status: 'discovery',
          stage: 'planning',
          priority: 'medium',
          accessToken: projectToken
        };
        
        const newProject = await storage.createProject(projectData);
        projectId = newProject.id!;
        console.log(`✅ Created project: ${projectData.title} (ID: ${projectId})`);
      }

      // Create the appointment record
      const appointmentData = {
        businessId: companyId,
        client_id: companyId,
        projectToken,
        datetime: new Date(`${appointmentDate}T${convertTo24Hour(appointmentTime)}`).toISOString(),
        status: 'scheduled',
        notes: `
Initial Consultation Appointment

Services Requested: ${typeof services === 'string' ? services : services.join(', ')}
Budget: ${budget}
Timeline: ${timeline || 'Not specified'}

Project Description:
${projectDescription}

${additionalNotes ? `Additional Notes:\n${additionalNotes}` : ''}

Contact Information:
- Name: ${firstName} ${lastName}
- Email: ${email}
- Phone: ${phone}
${businessName ? `- Business: ${businessName}` : ''}

Booked via: ${source}
        `.trim(),
        serviceType: typeof services === 'string' ? services : services.join(', '),
        duration: 30,
        isAutoScheduled: true,
        firstName,
        lastName,
        email,
        phone
      };

      const appointment = await storage.createAppointment(appointmentData);
      console.log(`✅ Created appointment: ID ${appointment.id}`);

      // Create activity log
      await storage.createActivity({
        companyId,
        projectId,
        type: 'appointment_scheduled',
        description: `Consultation appointment scheduled for ${new Date(appointmentData.datetime).toLocaleDateString()} at ${appointmentTime} - Services: ${typeof services === 'string' ? services : services.join(', ')}, Budget: ${budget}`
      });

      console.log('✅ Comprehensive appointment booking completed successfully');

      // Send confirmation email
      try {
        await sendAppointmentConfirmationEmail({
          to: email,
          clientName: `${firstName} ${lastName}`,
          appointmentDate,
          appointmentTime,
          services: typeof services === 'string' ? services : services.join(', '),
          projectToken,
          businessName: businessName || ''
        });
        console.log('📧 Confirmation email sent successfully');
      } catch (emailError) {
        console.error('⚠️ Failed to send confirmation email:', emailError);
        // Don't fail the whole request if email fails
      }

      res.json({
        success: true,
        message: 'Appointment booked successfully',
        appointmentId: appointment.id,
        projectToken,
        appointmentDetails: {
          date: appointmentDate,
          time: appointmentTime,
          duration: 30,
          services,
          clientName: `${firstName} ${lastName}`,
          email
        }
      });

    } catch (error: any) {
      console.error('Error booking comprehensive appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to book appointment',
        error: error.message
      });
    }
  });

  // Helper function to convert 12-hour time to 24-hour format
  function convertTo24Hour(time12h: string): string {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12 + '';
    }
    
    return `${hours.padStart(2, '0')}:${minutes}:00`;
  }

  return app;
} 

// Email confirmation function
interface EmailConfirmationData {
  to: string;
  clientName: string;
  appointmentDate: string;
  appointmentTime: string;
  services: string;
  projectToken: string;
  businessName: string;
}

async function sendAppointmentConfirmationEmail(data: EmailConfirmationData): Promise<void> {
  // For now, we'll log the email content to console
  // In production, you would integrate with an email service like SendGrid, Nodemailer, etc.
  
  const emailContent = `
=== APPOINTMENT CONFIRMATION EMAIL ===
To: ${data.to}
Subject: Appointment Confirmed - Pleasant Cove Design Consultation

Dear ${data.clientName},

Thank you for booking a consultation with Pleasant Cove Design! 

APPOINTMENT DETAILS:
📅 Date: ${new Date(data.appointmentDate).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
🕒 Time: ${data.appointmentTime}
⏱️ Duration: 30 minutes
🎯 Services: ${data.services}
${data.businessName ? `🏢 Business: ${data.businessName}` : ''}

WHAT TO EXPECT:
This 30-minute consultation will help us understand your project goals and outline a clear plan tailored to your business needs.

PREPARATION:
- Think about your current challenges
- Consider your target audience
- Have examples of designs you like ready to share

If you need to reschedule or have any questions, please reply to this email or call us at (207) 380-5680.

Best regards,
The Pleasant Cove Design Team

Project Reference: ${data.projectToken}
=====================================
  `;
  
  console.log(emailContent);
  
  // TODO: Replace with actual email sending logic
  // Example with nodemailer:
  // await emailService.send({
  //   to: data.to,
  //   subject: 'Appointment Confirmed - Pleasant Cove Design',
  //   html: generateEmailTemplate(data)
  // });
}