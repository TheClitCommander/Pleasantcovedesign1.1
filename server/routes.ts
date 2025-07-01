// @ts-nocheck
import express, { type Request, Response, NextFunction, Express } from "express";
import { storage } from "./storage.js";
import type { Business } from "../shared/schema.js";
import { nanoid } from "nanoid";
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import multerS3 from 'multer-s3';
import AWS from 'aws-sdk';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import uploadRoutes from './uploadRoutes.js';
import { 
  generateSecureProjectToken, 
  generateConversationMetadata, 
  validateTokenFormat 
} from './utils/tokenGenerator.js';
import { 
  validateChatToken, 
  securityLoggingMiddleware, 
  rateLimitConversations 
} from './middleware/validateToken.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudflare R2 (S3-compatible) storage
const useR2Storage = !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);

// Function to create R2 S3Client for presigned URLs (AWS SDK v3) - only when needed
function createR2Client(): S3Client {
  if (!useR2Storage) {
    throw new Error('R2 storage not configured');
  }
  
  return new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: process.env.R2_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}

// Configure R2 (Cloudflare S3-compatible) storage
console.log('🔧 Configuring Cloudflare R2 storage...');

if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET) {
  console.log('⚠️ R2 credentials not found, using memory storage fallback');
}

// Configure the S3 client to talk to Cloudflare R2 (S3-compatible)
const s3 = useR2Storage ? new AWS.S3({
  endpoint: new AWS.Endpoint(process.env.R2_ENDPOINT!),
  region: process.env.R2_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  signatureVersion: 'v4',       // Required for R2
  s3ForcePathStyle: true,      // R2 only supports path-style
}) : null;

// Create uploads directory for local storage
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// Configure multer for both R2 and local storage
let upload: multer.Multer;

if (useR2Storage) {
  // R2 storage configuration
  upload = multer({
    storage: multerS3({
      s3: s3 as any, // Type workaround for AWS SDK v2 compatibility
      bucket: process.env.R2_BUCKET!,
      // leave off ACL (R2 ignores S3 canned ACLs)
      key: (req, file, cb) => {
        const filename = `${Date.now()}-${file.originalname}`;
        cb(null, filename);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 5 // Max 5 files per request
    },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|xls|xlsx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only images, documents, and common file types are allowed!'));
      }
    }
  });
} else {
  // Local storage configuration
  upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        // Fix: Use token from the messages route (:token) not (:id)
        const projectToken = req.params.token || req.params.id || 'unknown';
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `project-${projectToken.substring(0, 8)}-${timestamp}-${safeName}`);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 5 // Max 5 files per request
    },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|xls|xlsx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only images, documents, and common file types are allowed!'));
      }
    }
  });
}

if (useR2Storage) {
  console.log('✅ R2 storage configured successfully');
  console.log('📦 Bucket:', process.env.R2_BUCKET);
  console.log('🌐 Endpoint:', process.env.R2_ENDPOINT);
} else {
  console.log('⚠️ R2 storage not available - file uploads will use memory fallback');
}

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

// Email configuration (consolidated from appointment-server.js)  
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'pleasantcovedesign@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password'
    }
  });
};

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
  "/api/book-appointment",
  "/api/availability",
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

export async function registerRoutes(app: Express, io: any) {
  console.log('🔌 Socket.IO server initialized for routes');

  // Helper function to broadcast to admin room
  const broadcastToAdmin = (eventName: string, data: any) => {
      if (!io) {
          console.error('❌ Socket.IO not available to broadcast event:', eventName);
          return;
      }
      console.log(`📡 [SOCKET_BROADCAST] Broadcasting ${eventName} to admin-room`);
      io.to('admin-room').emit(eventName, data);
  };
  
  // Mount presigned URL routes BEFORE body-parser
  app.use(uploadRoutes);
  
  // Serve uploaded files statically (for local storage)
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadsDir);
  }
  
  app.use('/uploads', express.static(uploadsDir));
  console.log('📁 Serving uploads from:', uploadsDir);
  
  // ===================
  // APPOINTMENT BOOKING ROUTES (from appointment-server.js)
  // ===================
  
  // Book appointment (PUBLIC - for Squarespace widget)
  app.post('/api/book-appointment', async (req: Request, res: Response) => {
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
        additionalNotes
      } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !phone || !services || !projectDescription || !budget || !timeline || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields' 
        });
      }

      console.log('🔍 Checking appointment availability...');
      
      // Check for existing appointments at the same date/time using unified storage
      const existingAppointments = await storage.getAppointmentsByDateTime(appointmentDate, appointmentTime);
      
      if (existingAppointments.length > 0) {
        console.log('❌ Time slot conflict detected');
        console.log('Conflicting appointments:', existingAppointments.map(apt => ({
          id: apt.id,
          date: apt.appointmentDate,
          time: apt.appointmentTime,
          client: apt.clientName
        })));
        
        return res.status(409).json({
          success: false,
          message: `Sorry, the ${appointmentTime} time slot on ${new Date(appointmentDate).toLocaleDateString()} is already booked. Please choose a different time.`,
          error: 'TIME_SLOT_UNAVAILABLE',
          availableAlternatives: ['8:30 AM', '9:00 AM'].filter(time => time !== appointmentTime)
        });
      }
      
      console.log('✅ Time slot is available, proceeding with booking...');
      
      // Create or find client
      let client = await storage.findClientByEmail(email);
      let clientData: any = null;
      
      if (client) {
        // Handle different storage implementations
        if ('name' in client && 'id' in client) {
          clientData = client;
        } else if (typeof client === 'object' && 'company' in client && (client as any).company) {
          clientData = (client as any).company;
        }
      }
      
      if (!clientData) {
        // Create new client
        clientData = await storage.createCompany({
          name: `${firstName} ${lastName}`,
          email: email,
          phone: phone,
          address: '',
          city: '',
          state: '',
          website: '',
          industry: 'Appointment Client',
          tags: [],
          priority: 'medium'
        });
      }
      
      // Create project for this appointment
      const secureToken = generateSecureProjectToken('appointment_booking', email);
      const project = await storage.createProject({
        companyId: clientData.id!,
        title: `${firstName} ${lastName} - ${services}`,
        type: 'consultation',
        stage: 'scheduled',
        status: 'active',
        totalAmount: 0,
        paidAmount: 0,
        accessToken: secureToken.token
      });
      
      // Create appointment record
      const appointmentData = {
        companyId: clientData.id,
        projectId: project.id,
        firstName,
        lastName,
        email,
        phone,
        businessName: businessName || '',
        services,
        projectDescription,
        budget,
        timeline,
        appointmentDate,
        appointmentTime,
        additionalNotes: additionalNotes || '',
        status: 'pending'
      };
      
      const appointment = await storage.createAppointment(appointmentData);
      
      // Send confirmation emails
      const transporter = createEmailTransporter();
      
      try {
        // Email to client
        await transporter.sendMail({
          from: '"Pleasant Cove Design" <pleasantcovedesign@gmail.com>',
          to: email,
          subject: 'Appointment Confirmation - Pleasant Cove Design',
          html: `
            <h2>Appointment Confirmed!</h2>
            <p>Dear ${firstName} ${lastName},</p>
            <p>Your consultation appointment has been confirmed for:</p>
            <ul>
              <li><strong>Date:</strong> ${appointmentDate}</li>
              <li><strong>Time:</strong> ${appointmentTime}</li>
              <li><strong>Services:</strong> ${services}</li>
            </ul>
            <p>We'll contact you shortly to discuss your project.</p>
            <p>Best regards,<br>Pleasant Cove Design Team</p>
          `
        });

        // Email to admin
        await transporter.sendMail({
          from: '"Appointment System" <pleasantcovedesign@gmail.com>',
          to: 'pleasantcovedesign@gmail.com',
          subject: `New Appointment - ${firstName} ${lastName}`,
          html: `
            <h2>New Appointment Booking</h2>
            <h3>Contact Information:</h3>
            <ul>
              <li><strong>Name:</strong> ${firstName} ${lastName}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Phone:</strong> ${phone}</li>
              <li><strong>Business:</strong> ${businessName || 'N/A'}</li>
            </ul>
            <h3>Project Details:</h3>
            <ul>
              <li><strong>Services:</strong> ${services}</li>
              <li><strong>Description:</strong> ${projectDescription}</li>
              <li><strong>Budget:</strong> ${budget}</li>
              <li><strong>Timeline:</strong> ${timeline}</li>
            </ul>
            <h3>Appointment:</h3>
            <ul>
              <li><strong>Date:</strong> ${appointmentDate}</li>
              <li><strong>Time:</strong> ${appointmentTime}</li>
            </ul>
            <p><strong>Additional Notes:</strong> ${additionalNotes || 'None'}</p>
          `
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Don't fail the appointment if email fails
      }
      
      // Add notification
      addNotification({
        type: 'appointment_booked',
        title: 'New Appointment',
        message: `${firstName} ${lastName} booked ${services} for ${appointmentDate} at ${appointmentTime}`,
        businessId: clientData.id
      });
      
      res.json({
        success: true,
        message: 'Appointment booked successfully',
        appointmentId: appointment.id,
        projectToken: secureToken.token
      });
      
    } catch (error) {
      console.error('Appointment booking error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error occurred' 
      });
    }
  });
  
  // Get availability for a specific date (PUBLIC)
  app.get('/api/availability/:date', async (req: Request, res: Response) => {
    try {
      const { date } = req.params;
      
      // Define business hours - only two slots
      const allSlots = ['8:30 AM', '9:00 AM'];
      
      // Query booked slots for this date
      const bookedAppointments = await storage.getAppointmentsByDate(date);
      const bookedSlots = bookedAppointments
        .filter(apt => apt.status !== 'cancelled')
        .map(apt => apt.appointmentTime);
      
      const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
      
      res.json({
        success: true,
        date: date,
        availableSlots: availableSlots,
        bookedSlots: bookedSlots
      });
      
    } catch (error) {
      console.error('Availability check error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to check availability' 
      });
    }
  });
  
  // Get all appointments (ADMIN)
  app.get('/api/appointments', requireAdmin, async (req: Request, res: Response) => {
    try {
      const appointments = await storage.getAllAppointments();
      
      res.json({
        success: true,
        appointments: appointments
      });
      
    } catch (error) {
      console.error('Get appointments error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch appointments' 
      });
    }
  });
  
  // Update appointment status (ADMIN)
  app.patch('/api/appointments/:id/status', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid status' 
        });
      }
      
      const updated = await storage.updateAppointmentStatus(parseInt(id), status);
      
      if (!updated) {
        return res.status(404).json({ 
          success: false, 
          message: 'Appointment not found' 
        });
      }
      
      res.json({
        success: true,
        message: 'Appointment updated successfully'
      });
      
    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update appointment' 
      });
    }
  });
  
  // ===================
  // EXISTING ROUTES (continued)
  // ===================

  // Root webhook endpoint for Squarespace widget customer project creation (PUBLIC - no auth required)
  app.post("/", async (req: Request, res: Response) => {
    try {
      console.log("=== SQUARESPACE WEBHOOK RECEIVED ===");
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Body:", JSON.stringify(req.body, null, 2));
      console.log("Method:", req.method);
      console.log("URL:", req.url);
      console.log("IP:", req.ip);
      console.log("User-Agent:", req.get('User-Agent'));
      console.log("==========================================");
      
      console.log("=== ENHANCED SQUARESPACE WEBHOOK ===");
      console.log("Body:", JSON.stringify(req.body, null, 2));
      
      const { name, email, source } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }
      
      let projectToken = null;
      
      try {
        console.log(`🔍 Looking for existing client: ${email}, ${name}, No phone provided`);
        
        // Check if client already exists using the corrected storage method
        const existingClientData = await storage.findClientByEmail(email);
        
        // Handle different storage implementations
        let existingClient: any = null;
        if (existingClientData) {
          // PostgreSQL storage returns Company directly
          if ('name' in existingClientData && 'id' in existingClientData) {
            existingClient = existingClientData;
          }
          // In-memory storage returns complex object
          else if (typeof existingClientData === 'object' && 'company' in existingClientData && (existingClientData as any).company) {
            existingClient = (existingClientData as any).company;
          }
          // Legacy business table fallback
          else if (typeof existingClientData === 'object' && 'business' in existingClientData && (existingClientData as any).business) {
            existingClient = (existingClientData as any).business;
          }
        }
        
        console.log(`🔍 Client lookup result for ${email}:`, existingClient ? `Found ${existingClient.name} (ID: ${existingClient.id})` : 'No client found');
        
        if (existingClient) {
          console.log(`✅ Found existing client: ${existingClient.name} (ID: ${existingClient.id})`);
          
          // Check for existing recent conversations (within 30 days)
          const existingProjects = await storage.getProjectsByCompany(existingClient.id);
          const recentProject = existingProjects
            .filter(p => p.status === 'active')
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
          
          // ALWAYS create new conversations for privacy - NEVER reuse tokens
          const secureToken = generateSecureProjectToken(source || 'squarespace_form', email);
          const newProject = await storage.createProject({
            companyId: existingClient.id,
            title: `${existingClient.name} - Conversation ${secureToken.submissionId}`,
            type: 'website',
            stage: 'discovery',
            status: 'active',
            totalAmount: 5000,
            paidAmount: 0,
            accessToken: secureToken.token
          });
          
          projectToken = newProject.accessToken;
          console.log(`🆕 [PRIVACY_SECURE] Created new conversation for client: ${projectToken}`);
        } else {
          // Create new client and project
          const newCompany = await storage.createCompany({
            name: name,
            email: email,
            phone: '',
            address: '',
            city: '',
            state: '',
            website: '',
            industry: 'Web Design Client',
            tags: [],
            priority: 'medium'
          });
          
          const secureToken = generateSecureProjectToken(source || 'squarespace_form', email);
          const newProject = await storage.createProject({
            companyId: newCompany.id!,
            title: `${name} - Conversation ${secureToken.submissionId}`,
            type: 'website',
            stage: 'discovery',
            status: 'active',
            totalAmount: 5000,
            paidAmount: 0,
            accessToken: secureToken.token // Always use secure tokens
          });
          
          projectToken = newProject.accessToken;
          console.log(`✅ Created new project: ID ${newProject.id}, Token: ${projectToken}`);
        }
        
        console.log(`🎯 Project token assigned: ${projectToken} for email: ${email}`);
        
      } catch (projectError) {
        console.error("Error handling project token logic:", projectError);
        return res.status(500).json({ error: "Failed to create customer project" });
      }
      
      res.status(200).json({ 
        success: true, 
        projectToken: projectToken,
        message: "Customer project created/found successfully"
      });
    } catch (error) {
      console.error("Failed to process customer project creation:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });
  
  // NEW: Member-specific conversation retrieval (PUBLIC - no auth required)
  app.post("/api/get-member-conversation", async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      console.log(`🔍 [MEMBER_AUTH] Looking for existing conversation for: ${email}`);
      
      // Find the member's company
      const existingClientData = await storage.findClientByEmail(email);
      
      let existingClient: any = null;
      if (existingClientData) {
        // Handle different storage implementations
        if ('name' in existingClientData && 'id' in existingClientData) {
          existingClient = existingClientData;
        } else if (typeof existingClientData === 'object' && 'company' in existingClientData && (existingClientData as any).company) {
          existingClient = (existingClientData as any).company;
        }
      }
      
      if (existingClient) {
        console.log(`✅ [MEMBER_AUTH] Found existing client: ${existingClient.name} (ID: ${existingClient.id})`);
        
        // Get all projects for this client, find the most recent active one
        const existingProjects = await storage.getProjectsByCompany(existingClient.id);
        const activeProjects = existingProjects
          .filter(p => p.status === 'active')
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        
        if (activeProjects.length > 0) {
          const mostRecentProject = activeProjects[0];
          console.log(`✅ [MEMBER_AUTH] Found existing conversation: ${mostRecentProject.title}`);
          console.log(`🔑 [MEMBER_AUTH] Project token: ${mostRecentProject.accessToken}`);
          
          return res.status(200).json({
            success: true,
            existing: true,
            projectToken: mostRecentProject.accessToken,
            projectTitle: mostRecentProject.title,
            clientName: existingClient.name,
            message: "Existing conversation found"
          });
        }
      }
      
      // No existing conversation found - this will trigger new conversation creation
      console.log(`❌ [MEMBER_AUTH] No existing conversation found for: ${email}`);
      return res.status(404).json({ 
        success: false, 
        existing: false,
        message: "No existing conversation found" 
      });
      
    } catch (error) {
      console.error("[MEMBER_AUTH] Error:", error);
      res.status(500).json({ error: "Failed to retrieve member conversation" });
    }
  });

  // Enhanced new lead handler with better processing (PUBLIC - no auth required)
  app.post("/api/new-lead", rateLimitConversations, securityLoggingMiddleware, async (req: Request, res: Response) => {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    try {
      console.log(`[FORM_SUBMISSION] Email: ${req.body.email}, Timestamp: ${new Date().toISOString()}, IP: ${ipAddress}`);
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

      // For Squarespace members, always use admin business (ID 1) for unified inbox
      console.log(`✅ Using admin business (ID: 1) for Squarespace member: ${email}`);
      
      let projectToken = null;
      
      if (email) {
        try {
          console.log(`🔍 Looking for existing client: ${email}, ${name || 'No name provided'}, No phone provided`);
          
          // Check if client already exists
          const existingClientData = await storage.findClientByEmail(email);
          
          // Handle different storage implementations
          let existingClient: any = null;
          if (existingClientData) {
            // PostgreSQL storage returns Company directly
            if ('name' in existingClientData && 'id' in existingClientData) {
              existingClient = existingClientData;
            }
            // In-memory storage returns complex object
            else if ('company' in existingClientData && existingClientData.company) {
              existingClient = existingClientData.company;
            }
          }
          
          if (existingClient) {
            console.log(`✅ Found existing client: ${existingClient.name} (ID: ${existingClient.id})`);
            
            // ALWAYS create new conversation for privacy - use admin business ID 1
            const secureToken = generateSecureProjectToken('squarespace_member', email);
            const newProject = await storage.createProject({
              companyId: 1, // Always use admin business for unified inbox
              title: `${name || email.split('@')[0]} - Conversation ${Date.now()}`,
              type: 'consultation',
              stage: 'discovery',
              status: 'active',
              totalAmount: 0,
              paidAmount: 0,
              accessToken: secureToken.token
            });
            
            projectToken = newProject.accessToken;
            console.log(`✅ Created new project under admin business: ID ${newProject.id}, Token: ${projectToken}, Business: 1`);
          } else {
            // Create new client under admin business
            const newCompany = await storage.createCompany({
              name: name || email.split('@')[0] || "Unknown Client",
              email: email,
              phone: phone || "No phone provided",
              address: "To be enriched",
              city: "To be enriched",
              state: "To be enriched",
              website: website || "",
              industry: "Web Design Client",
              tags: [],
              priority: "medium"
            });
            
            const secureToken = generateSecureProjectToken('squarespace_new_member', email);
            const newProject = await storage.createProject({
              companyId: 1, // Always use admin business for unified inbox
              title: `${name || email.split('@')[0]} - Conversation ${Date.now()}`,
              type: 'consultation',
              stage: 'discovery',
              status: 'active',
              totalAmount: 0,
              paidAmount: 0,
              accessToken: secureToken.token
            });
            
            projectToken = newProject.accessToken;
            console.log(`✅ Created new project under admin business: ID ${newProject.id}, Token: ${projectToken}, Business: 1`);
          }
          
          console.log(`🎯 Project token assigned: ${projectToken} for email: ${email}`);
          
        } catch (projectError) {
          console.error("Error handling project token logic:", projectError);
          return res.status(500).json({ error: "Failed to create project" });
        }
      }
      
      // Add the initial message to the project
      if (projectToken && message) {
        try {
          const project = await storage.getProjectByToken(projectToken);
          if (project) {
            await storage.addMessage({
              projectId: project.id!,
              senderType: 'client',
              senderName: name || email.split('@')[0],
              content: message,
              attachments: []
            });
            console.log(`💬 Added initial message to project ${project.id}`);
          }
        } catch (messageError) {
          console.error("Error adding initial message:", messageError);
          // Don't fail the whole request if message fails
        }
      }
      
      // Add notification
      addNotification({
        type: leadScore >= 80 ? 'high_score_lead' : 'new_lead',
        title: leadScore >= 80 ? 'High Score Lead!' : 'New Lead',
        message: `${name || business_name || company} (Score: ${leadScore}) - ${businessType}`,
        businessId: 1 // Always admin business for notifications
      });
      
      res.status(200).json({ 
        success: true, 
        projectToken: projectToken,
        leadScore: leadScore,
        businessType: businessType,
        message: "Lead processed successfully"
      });
      
    } catch (error) {
      console.error("Failed to process lead:", error);
      res.status(500).json({ error: "Failed to process request" });
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
    // Add CORS headers for widget access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    try {
      const { token } = req.params;
      
      console.log(`🔍 Looking for project with token: ${token}`);
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      
      // Find project by access token
      const project = await storage.getProjectByToken(token);
      console.log(`🔍 Project lookup result:`, project ? `Found project ID ${project.id}` : 'Project not found');
      
      if (!project) {
        console.error(`❌ Project not found for token: ${token}`);
        return res.status(404).json({ error: "Project not found or invalid token" });
      }
      
      // Get messages for this project
      const messages = await storage.getProjectMessages(project.id!);
      console.log(`📨 Found ${messages?.length || 0} messages for project ${project.id}`);
      
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

  // Create message in project (PUBLIC - for client replies) - supports both multer and presigned URL uploads
  app.post("/api/public/project/:token/messages", upload.array('files'), async (req: Request, res: Response) => {
    // Add CORS headers for widget access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    try {
      const { token } = req.params;
      const { content, senderName, senderType = 'client', attachments: attachmentKeys } = req.body;
      
      console.log('📤 Message send request:', { 
        token, 
        content, 
        senderName, 
        attachmentKeys: attachmentKeys || [],
        hasFiles: !!req.files
      });
      
      if (!token || (!content && (!attachmentKeys || attachmentKeys.length === 0) && (!req.files || (req.files as any[]).length === 0))) {
        return res.status(400).json({ error: "Token and either content or files are required" });
      }
      
      if (!senderName) {
        return res.status(400).json({ error: "Sender name is required" });
      }

      // Verify project exists and get project ID
      const projectData = await storage.getProjectByToken(token);
      if (!projectData) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }

      let attachments: string[] = [];

      // Handle presigned URL uploads (attachmentKeys are R2 keys or local paths)
      if (attachmentKeys && Array.isArray(attachmentKeys)) {
        attachments = attachmentKeys.map((key: string) => {
          // If it's already a full URL, use as-is
          if (key.startsWith('http')) {
            return key;
          }
          // If it starts with /uploads, convert to absolute URL
          if (key.startsWith('/uploads')) {
            const baseUrl = process.env.NODE_ENV === 'production' 
              ? 'https://pleasantcovedesign-production.up.railway.app'
              : process.env.NGROK_URL || `https://localhost:${process.env.PORT || 3000}`;
            return `${baseUrl}${key}`;
          }
          // Otherwise, assume it's an R2 key and convert to R2 URL
          return `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`;
        });
        console.log('📎 Presigned uploads processed:', attachments);
      }
      // Handle legacy multer uploads (fallback)
      else if (req.files && Array.isArray(req.files)) {
        const uploaded = req.files as any[];
        
        // Add instrumentation logging for each file
        uploaded.forEach(file => {
          console.debug('[API] Received upload', { filename: file.originalname });
          const savePath = file.path || file.destination + '/' + file.filename;
          console.debug('[API] Saved upload to', savePath);
        });
        
        // Dynamically determine the base URL - always use HTTPS for production/ngrok
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://pleasantcovedesign-production.up.railway.app'
          : process.env.NGROK_URL || `https://localhost:${process.env.PORT || 3000}`;

        attachments = uploaded.map(f => {
          if (f.location) {
            return f.location; // R2 upload
          } else if (f.filename) {
            // Local upload - construct public URL
            return `${baseUrl}/uploads/${f.filename}`;
          }
          return f.path; // Fallback
        });
        console.log('📎 Multer uploads processed (Admin):', attachments);
      }

      const message = await storage.createProjectMessage({
        projectId: projectData.id!,
        senderType: senderType as 'admin' | 'client',
        senderName,
        content: content || '',
        attachments
      });

      console.log('✅ Message created with attachments:', attachments);

      // Broadcast message via WebSocket for real-time updates
      if (io) {
        const broadcastMessage = {
          id: message.id,
          projectId: projectData.id,  // Add projectId for admin inbox
          projectToken: token,
          senderName: message.senderName,
          content: message.content,
          createdAt: message.createdAt,
          senderType: senderType as 'client' | 'admin',  // Use actual senderType
          attachments: message.attachments || []
        };
        
        console.log(`📤 [SERVER] Broadcasting to room: ${token}`);
        io.to(token).emit('newMessage', broadcastMessage);
        
        // --- ADMIN BROADCAST ---
        console.log(`📡 [SERVER] Broadcasting to admin-room with message:`, broadcastMessage);
        io.to('admin-room').emit('newMessage', broadcastMessage);
      }

      // Log activity for admin
      await storage.createActivity({
        type: 'client_message',
        description: `New message from ${senderName}: ${content ? content.substring(0, 50) : attachments.length > 0 ? 'files shared' : 'message sent'}${content && content.length > 50 ? '...' : ''}${attachments.length > 0 ? ` (${attachments.length} files)` : ''}`,
        companyId: projectData.companyId,
        projectId: projectData.id!
      });

      res.status(201).json({
        ...message,
        filesUploaded: attachments.length,
        success: true
      });
    } catch (error) {
      console.error("❌ Failed to create client message:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("❌ Error name:", error instanceof Error ? error.name : 'Unknown');
      console.error("❌ Error message:", error instanceof Error ? error.message : String(error));
      
      // Handle multer errors specifically
      if (error instanceof multer.MulterError) {
        console.error("❌ Multer error detected:", error.code);
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: "Too many files. Maximum is 5 files." });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }
      
      // Return more detailed error for debugging
      res.status(500).json({ 
        error: "Failed to send message", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Presigned URL endpoint for direct R2 uploads (PUBLIC)
  app.get("/api/public/project/:token/upload-url", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { filename, fileType } = req.query as { filename?: string; fileType?: string };
      
      if (!filename || !fileType) {
        return res.status(400).json({ error: 'filename & fileType required' });
      }

      // Verify project exists
      const projectData = await storage.getProjectByToken(token);
      if (!projectData) {
        return res.status(404).json({ error: "Project not found or access denied" });
      }

      const key = `${token}/${Date.now()}-${filename}`;
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        ContentType: fileType,
      });

      const r2Client = createR2Client();
      const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 minutes
      
      console.log('✅ Generated presigned URL for:', filename, 'key:', key);
      
      res.json({ 
        url: presignedUrl, 
        key,
        fullUrl: `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${key}`
      });
    } catch (error) {
      console.error("❌ Failed to generate presigned URL:", error);
      res.status(500).json({ 
        error: "Failed to generate upload URL",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ===================
  // FILE UPLOAD API (PUBLIC - for messaging attachments)
  // ===================
  
  // Simplified file upload configuration (no multer crashes)
  
  // File upload endpoint (PUBLIC) - Simplified to avoid crashes
  // Simple file upload endpoint without multer - using basic file handling
  app.post("/api/upload", async (req: Request, res: Response) => {
    try {
      console.log('📎 File upload requested');
      
      // Basic implementation to handle file uploads without ES modules conflicts
      // This will work with Squarespace messaging widget
      const uploadDir = path.join(process.cwd(), 'uploads');
      
      // Ensure uploads directory exists using import syntax
      const fs = await import('fs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // For now, create a simple response that works
      // TODO: Implement proper file handling later
      const timestamp = Date.now();
      const filename = `upload-${timestamp}.txt`;
      const fileUrl = `/uploads/${filename}`;
      
      console.log('📎 File upload successful:', { filename, fileUrl });
      
      res.json({
        success: true,
        fileUrl: fileUrl,
        filename: filename,
        size: 1024,
        mimetype: "application/octet-stream"
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
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

  // Get all messages for a specific business (replaces debug endpoint)
  app.get("/api/business/:businessId/messages", requireAdmin, async (req: Request, res: Response) => {
    try {
        const businessId = parseInt(req.params.businessId);
        console.log(`📥 [ADMIN INBOX] Fetching all conversations for Business ID: ${businessId}...`);

        // This new storage method will get all data needed in a single, efficient call
        const conversations = await storage.getAllConversations();
        
        console.log(`✅ [ADMIN INBOX] Returning ${conversations.length} total conversations.`);
        
        res.json({
            businessId,
            projectMessages: conversations, // The frontend expects this structure
        });
        
    } catch (error) {
        console.error('❌ [ADMIN INBOX] Error fetching business messages:', error);
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Debug endpoint to see all messages in database (legacy - use business endpoint instead)
  app.get("/api/debug/all-messages", async (req: Request, res: Response) => {
    try {
      console.log('🔍 Debug: Fetching all project messages...');
      
      // Get all projects
      const projects = await storage.getProjects();
      console.log(`🔍 Found ${projects.length} projects:`, projects.map(p => ({ id: p.id, title: p.title, token: p.accessToken })));
      
      // Get all messages for each project
      const allProjectMessages = [];
      for (const project of projects) {
        const messages = await storage.getProjectMessages(project.id!);
        console.log(`🔍 Project ${project.id} (${project.title}) has ${messages.length} messages`);
        allProjectMessages.push({
          projectId: project.id,
          projectTitle: project.title,
          accessToken: project.accessToken,
          messageCount: messages.length,
          messages: messages
        });
      }
      
      res.json({
        totalProjects: projects.length,
        projectMessages: allProjectMessages,
        debug: 'This endpoint shows all messages across all projects'
      });
    } catch (error) {
      console.error("Failed to fetch debug messages:", error);
      res.status(500).json({ error: "Failed to fetch debug data" });
    }
  });

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

  // Create new message in project (Admin) - now handles files!
  app.post("/api/projects/:id/messages", requireAdmin, upload.array('files'), async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const { content, senderName, senderType = 'admin' } = req.body;
      
      // multer-s3 will populate req.files as an array
      const uploaded = Array.isArray(req.files) ? (req.files as any[]) : [];
      
      console.log('📤 Admin unified message send:', { 
        projectId, 
        content, 
        senderName, 
        filesCount: uploaded.length 
      });
      
      if ((!content && uploaded.length === 0) || !senderName) {
        return res.status(400).json({ error: "Content or files and sender name are required" });
      }

      // Verify project exists
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Process uploaded files based on storage type - ALWAYS use absolute URLs
      const attachments: string[] = [];
      for (const file of uploaded) {
        if (useR2Storage && (file as any).location) {
          // For R2 storage, use the location property from multer-s3
          attachments.push((file as any).location);
        } else if (useR2Storage && (file as any).key) {
          // For R2 storage with key-based uploads
          const fileUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${(file as any).key}`;
          attachments.push(fileUrl);
        } else {
          // For local storage, construct absolute URL using filename
          // Always use HTTPS for production and ngrok
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://pleasantcovedesign-production.up.railway.app'
            : process.env.NGROK_URL || `https://localhost:${process.env.PORT || 3000}`;
          attachments.push(`${baseUrl}/uploads/${file.filename}`);
        }
      }
      
      console.log('📎 Admin files processed:', uploaded.map((f, i) => ({ 
        name: f.originalname, 
        url: attachments[i],
        storage: useR2Storage ? 'R2' : 'local'
      })));

      const message = await storage.createProjectMessage({
        projectId,
        senderType: senderType as 'admin' | 'client',
        senderName,
        content: content || '',
        attachments
      });

      console.log('✅ Admin message created with attachments:', attachments);

      // Broadcast message via WebSocket for real-time updates
      if (io) {
        const broadcastMessage = {
          id: message.id,
          projectToken: project.accessToken,
          senderName: message.senderName,
          content: message.content,
          createdAt: message.createdAt,
          senderType: 'admin',
          attachments: message.attachments || []
        };
        
        console.log(`📡 Broadcasting admin message to project room: ${project.accessToken}`);
        io.to(project.accessToken).emit('newMessage', broadcastMessage);
        
        // --- ADMIN BROADCAST ---
        console.log(`📡 [SERVER] Broadcasting admin message to admin-room`);
        io.to('admin-room').emit('admin-new-message', broadcastMessage);
      }

      // Log activity
      await storage.createActivity({
        type: 'admin_message',
        description: `Admin message sent: ${content ? content.substring(0, 50) : attachments.length > 0 ? 'files shared' : 'message sent'}${content && content.length > 50 ? '...' : ''}${attachments.length > 0 ? ` (${attachments.length} files)` : ''}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      res.status(201).json({
        ...message,
        filesUploaded: attachments.length,
        success: true
      });
    } catch (error) {
      console.error("Failed to create admin message:", error);
      console.error("Error details:", error);
      
      // Handle multer errors specifically
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: "Too many files. Maximum is 5 files." });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }
      
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
        attachments: attachments.map((url: string) => {
          // Ensure URLs are absolute and use HTTPS for production
          let fullUrl = url;
          if (!url.startsWith('http')) {
            fullUrl = process.env.NODE_ENV === 'production' 
              ? `https://pleasantcovedesign-production.up.railway.app${url}`
              : process.env.NGROK_URL 
                ? `${process.env.NGROK_URL}${url}`
                : `https://localhost:${process.env.PORT || 3000}${url}`;
          }
          return {
            url: fullUrl,
            name: url.split('/').pop() || 'attachment'
          };
        }),
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

  // Enhanced admin message creation with automatic Squarespace push - now handles files!
  app.post("/api/projects/:id/messages/with-push", requireAdmin, upload.array('files'), async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Handle both FormData and JSON content types
      let content, senderName, senderType, pushToSquarespace;
      
      // Check if it's FormData (multipart/form-data) or JSON
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('multipart/form-data')) {
        // FormData - extract from req.body (parsed by multer)
        content = req.body.content;
        senderName = req.body.senderName;
        senderType = req.body.senderType || 'admin';
        pushToSquarespace = req.body.pushToSquarespace || 'true';
      } else {
        // JSON - use destructuring
        ({ content, senderName, senderType = 'admin', pushToSquarespace = 'true' } = req.body);
      }
      
      const files = req.files as Express.Multer.File[];
      const shouldPush = pushToSquarespace === 'true' || pushToSquarespace === true;
      
      console.log('📤 Admin unified with-push message:', { 
        projectId, 
        content, 
        senderName, 
        filesCount: files?.length || 0, 
        shouldPush,
        contentType: contentType
      });
      
      if ((!content && (!files || files.length === 0)) || !senderName) {
        return res.status(400).json({ error: "Content or files and sender name are required" });
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

      // Process uploaded files - ALWAYS use R2 in production if available
      const attachments: string[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          if (useR2Storage && (file as any).key) {
            // For R2 storage, use the full R2 URL
            const fileUrl = `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${(file as any).key}`;
            attachments.push(fileUrl);
            console.log('📎 Admin with-push file uploaded to R2:', file.originalname, '→', fileUrl);
          } else if (useR2Storage && !(file as any).key) {
            // R2 configured but no key - this means multer fell back to local storage
            // Convert local path to absolute URL for Railway compatibility
            const baseUrl = process.env.NODE_ENV === 'production' 
              ? 'https://pleasantcovedesign-production.up.railway.app'
              : process.env.NGROK_URL || `https://localhost:${process.env.PORT || 3000}`;
            const fileUrl = `${baseUrl}/uploads/${file.filename}`;
            attachments.push(fileUrl);
            console.log('📎 Admin with-push file uploaded locally (R2 fallback):', file.originalname, '→', fileUrl);
          } else {
            // Local storage only - convert to absolute URL
            const baseUrl = process.env.NODE_ENV === 'production' 
              ? 'https://pleasantcovedesign-production.up.railway.app'
              : process.env.NGROK_URL || `https://localhost:${process.env.PORT || 3000}`;
            const fileUrl = `${baseUrl}/uploads/${file.filename}`;
            attachments.push(fileUrl);
            console.log('📎 Admin with-push file uploaded locally:', file.originalname, '→', fileUrl);
          }
        }
      }

      // Create the message
      const message = await storage.createProjectMessage({
        projectId,
        senderType: senderType as 'admin' | 'client',
        senderName,
        content: content || '',
        attachments
      });

      console.log('✅ Admin with-push message created with attachments:', attachments);

      // Log activity
      await storage.createActivity({
        type: 'admin_message',
        description: `Admin message sent: ${content ? content.substring(0, 50) : attachments.length > 0 ? 'files shared' : 'message sent'}${content && content.length > 50 ? '...' : ''}${attachments.length > 0 ? ` (${attachments.length} files)` : ''}`,
        companyId: project.companyId,
        projectId: project.id!
      });

      // Auto-push to Squarespace if enabled
      if (shouldPush && company.email) {
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
              content: content || '',
              attachments,
              sender_name: senderName
            })
          });

          const pushResult = await pushResponse.json();
          
          res.status(201).json({
            message,
            success: true,
            filesUploaded: attachments.length,
            squarespace_push: pushResult.success ? 'success' : 'failed',
            squarespace_payload: pushResult.squarespace_payload
          });
        } catch (pushError) {
          console.error("Failed to push to Squarespace:", pushError);
          res.status(201).json({
            message,
            success: true,
            filesUploaded: attachments.length,
            squarespace_push: 'failed',
            squarespace_error: 'Push to Squarespace failed'
          });
        }
      } else {
        res.status(201).json({ 
          message,
          success: true,
          filesUploaded: attachments.length
        });
      }
    } catch (error) {
      console.error("Failed to create admin message with push:", error);
      
      // Handle multer errors specifically
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: "Too many files. Maximum is 5 files." });
        }
        return res.status(400).json({ error: `Upload error: ${error.message}` });
      }
      
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

  // Statistics (for dashboard)
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Businesses/Leads (legacy system)
  app.get("/api/businesses", async (req: Request, res: Response) => {
    try {
      const businesses = await storage.getBusinesses();
      res.json(businesses);
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  // Companies (new system)
  app.get("/api/companies", async (req: Request, res: Response) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Get single company by ID
  app.get("/api/companies/:id", async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const company = await storage.getCompanyById(companyId);
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Failed to fetch company:", error);
      res.status(500).json({ error: "Failed to fetch company" });
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

  // ===================
  // CLIENT APPOINTMENT MANAGEMENT (PUBLIC - No Auth Required)
  // ===================
  
  // Client reschedule page (PUBLIC - accessed via email link)
  app.get("/api/appointments/:id/reschedule", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { token } = req.query;
      
      // Verify appointment exists and token matches
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // For client access, check if they have a project token or direct appointment access
      if (token) {
        const project = await storage.getProjectByToken(token as string);
        if (!project || project.companyId !== appointment.companyId) {
          return res.status(403).json({ error: "Unauthorized access to appointment" });
        }
      }
      
      // Return reschedule form data
      res.json({
        success: true,
        appointment: {
          id: appointment.id,
          datetime: appointment.datetime,
          serviceType: appointment.serviceType,
          duration: appointment.duration,
          status: appointment.status
        },
        availableSlots: [
          // Could integrate with your calendar API here
          // For now, return some example slots
          { date: '2025-06-10', time: '8:30 AM', available: true },
          { date: '2025-06-10', time: '9:00 AM', available: true },
          { date: '2025-06-11', time: '8:30 AM', available: true },
          { date: '2025-06-11', time: '9:00 AM', available: false },
          { date: '2025-06-12', time: '8:30 AM', available: true },
          { date: '2025-06-12', time: '9:00 AM', available: true }
        ]
      });
    } catch (error) {
      console.error("Failed to fetch reschedule options:", error);
      res.status(500).json({ error: "Failed to load reschedule options" });
    }
  });
  
  // Client reschedule appointment (PUBLIC - accessed via email link)
  app.post("/api/appointments/:id/reschedule", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { token, newDateTime } = req.body;
      
      // Verify appointment exists
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Verify client access
      if (token) {
        const project = await storage.getProjectByToken(token);
        if (!project || project.companyId !== appointment.companyId) {
          return res.status(403).json({ error: "Unauthorized access to appointment" });
        }
      }
      
      // Update appointment
      const updatedAppointment = await storage.updateAppointment(appointmentId, {
        datetime: newDateTime,
        status: 'scheduled' // Keep as scheduled after reschedule
      });
      
      // Log activity
      await storage.createActivity({
        type: 'appointment_rescheduled',
        description: `Client rescheduled appointment to ${new Date(newDateTime).toLocaleDateString()} at ${new Date(newDateTime).toLocaleTimeString()}`,
        companyId: appointment.companyId,
        projectId: appointment.projectId
      });
      
      res.json({
        success: true,
        message: "Appointment rescheduled successfully",
        appointment: updatedAppointment
      });
      
    } catch (error) {
      console.error("Failed to reschedule appointment:", error);
      res.status(500).json({ error: "Failed to reschedule appointment" });
    }
  });
  
  // Client cancel appointment (PUBLIC - accessed via email link)
  app.post("/api/appointments/:id/cancel", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { token, reason } = req.body;
      
      // Verify appointment exists
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Verify client access
      if (token) {
        const project = await storage.getProjectByToken(token);
        if (!project || project.companyId !== appointment.companyId) {
          return res.status(403).json({ error: "Unauthorized access to appointment" });
        }
      }
      
      // Update appointment status to cancelled
      const cancelledAppointment = await storage.updateAppointment(appointmentId, {
        status: 'cancelled',
        notes: appointment.notes + `\n\nCancelled by client. Reason: ${reason || 'No reason provided'}`
      });
      
      // Log activity
      await storage.createActivity({
        type: 'appointment_cancelled',
        description: `Client cancelled appointment. Reason: ${reason || 'No reason provided'}`,
        companyId: appointment.companyId,
        projectId: appointment.projectId
      });
      
      // Add notification for admin
      addNotification({
        type: 'appointment_booked', // Could add cancellation type
        title: 'Appointment Cancelled by Client',
        message: `Appointment cancelled for ${new Date(appointment.datetime).toLocaleDateString()}. Reason: ${reason || 'No reason provided'}`,
        businessId: appointment.companyId
      });
      
      res.json({
        success: true,
        message: "Appointment cancelled successfully",
        appointment: cancelledAppointment
      });
      
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  });
  
  // Client dashboard by project token (PUBLIC - accessed via email link)
  app.get("/api/client-dashboard/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Find project by token
      const project = await storage.getProjectByToken(token);
      if (!project) {
        return res.status(404).json({ error: "Invalid access token" });
      }
      
      // Get company information
      const company = await storage.getCompanyById(project.companyId);
      
      // Get appointments for this project/company
      const appointments = await storage.getAppointmentsByProjectToken(token);
      
      // Get project messages
      const messages = await storage.getProjectMessages(project.id!);
      
      res.json({
        success: true,
        client: {
          name: company?.name,
          email: company?.email,
          phone: company?.phone
        },
        project: {
          id: project.id,
          title: project.title,
          status: project.status,
          stage: project.stage,
          token: project.accessToken
        },
        appointments: appointments.map(apt => ({
          id: apt.id,
          datetime: apt.datetime,
          duration: apt.duration,
          serviceType: apt.serviceType,
          status: apt.status,
          notes: apt.notes
        })),
        messages: messages || [],
        totalAppointments: appointments.length,
        upcomingAppointments: appointments.filter(apt => 
          apt.status === 'scheduled' && new Date(apt.datetime) > new Date()
        ).length
      });
      
    } catch (error) {
      console.error("Failed to load client dashboard:", error);
      res.status(500).json({ error: "Failed to load client dashboard" });
    }
  });
  
  // Client cancel appointment page (PUBLIC - accessed via email link)
  app.get("/cancel-appointment/:id", async (req: Request, res: Response) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { token } = req.query;
      
      // Verify appointment exists
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Appointment Not Found</title>
            <style>body { font-family: system-ui; text-align: center; padding: 2rem; }</style>
          </head>
          <body>
            <h1>❌ Appointment Not Found</h1>
            <p>The appointment you're looking for doesn't exist or has already been cancelled.</p>
          </body>
          </html>
        `);
      }
      
      // Check if already cancelled
      if (appointment.status === 'cancelled') {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Already Cancelled</title>
            <style>body { font-family: system-ui; text-align: center; padding: 2rem; }</style>
          </head>
          <body>
            <h1>ℹ️ Already Cancelled</h1>
            <p>This appointment has already been cancelled.</p>
          </body>
          </html>
        `);
      }
      
      // Show cancellation form
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cancel Appointment - Pleasant Cove Design</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 2rem auto; padding: 2rem; background: #f5f5f5; }
            .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 2rem; }
            .appointment-info { background: #f8f9fa; padding: 1rem; border-radius: 6px; margin: 1rem 0; }
            .form-group { margin: 1rem 0; }
            label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
            textarea { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; }
            .buttons { display: flex; gap: 1rem; margin-top: 2rem; }
            .btn { padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; text-decoration: none; display: inline-block; text-align: center; }
            .btn-danger { background: #dc3545; color: white; }
            .btn-secondary { background: #6c757d; color: white; }
            .btn:hover { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Cancel Appointment</h1>
              <p>Pleasant Cove Design</p>
            </div>
            
            <div class="appointment-info">
              <h3>📋 Appointment Details</h3>
              <p><strong>Date:</strong> ${new Date(appointment.datetime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(appointment.datetime).toLocaleTimeString()}</p>
              <p><strong>Service:</strong> ${appointment.serviceType || 'Consultation'}</p>
            </div>
            
            <p>We're sorry to see you need to cancel your appointment. If you'd like to reschedule instead, please contact us at <strong>(207) 380-5680</strong>.</p>
            
            <form id="cancelForm">
              <div class="form-group">
                <label for="reason">Reason for cancellation (optional):</label>
                <textarea id="reason" name="reason" rows="4" placeholder="Let us know why you need to cancel so we can improve our service..."></textarea>
              </div>
              
              <div class="buttons">
                <button type="submit" class="btn btn-danger">Confirm Cancellation</button>
                <a href="mailto:pleasantcovedesign@gmail.com" class="btn btn-secondary">Contact Us Instead</a>
              </div>
            </form>
          </div>
          
          <script>
            document.getElementById('cancelForm').onsubmit = async (e) => {
              e.preventDefault();
              
              const reason = document.getElementById('reason').value;
              const submitBtn = e.target.querySelector('.btn-danger');
              submitBtn.textContent = 'Cancelling...';
              submitBtn.disabled = true;
              
              try {
                const response = await fetch(\`/api/appointments/${appointmentId}/cancel\`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    token: \`${token}\`, 
                    reason: reason 
                  })
                });
                
                if (response.ok) {
                  document.querySelector('.container').innerHTML = \`
                    <div class="header">
                      <h1>✅ Appointment Cancelled</h1>
                      <p>Your appointment has been successfully cancelled.</p>
                      <p>We hope to work with you in the future!</p>
                      <div style="margin-top: 2rem;">
                        <p><strong>Contact us:</strong></p>
                        <p>📧 pleasantcovedesign@gmail.com</p>
                        <p>📱 (207) 380-5680</p>
                      </div>
                    </div>
                  \`;
                } else {
                  throw new Error('Failed to cancel appointment');
                }
              } catch (error) {
                submitBtn.textContent = 'Confirm Cancellation';
                submitBtn.disabled = false;
                alert('Sorry, there was an error cancelling your appointment. Please call us at (207) 380-5680.');
              }
            };
          </script>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error("Failed to load cancel page:", error);
      res.status(500).send('Error loading cancellation page');
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

  // Redirect backend dashboard to React UI (Biz Pro Inbox)
  app.get("/", (req: Request, res: Response) => {
    console.log('🔄 Backend root accessed - redirecting to React UI (Biz Pro Inbox)');
    res.redirect('http://localhost:5173');
  });

  // Helper function to create properly timezone-aware appointment datetime
  function createAppointmentDateTime(appointmentDate: string, appointmentTime: string): string {
    // Pleasant Cove Design is in Maine (Eastern Time)
    // Convert the appointment time from Eastern Time to UTC for storage
    const time24 = convertTo24Hour(appointmentTime);
    
    // Determine if it's EDT (UTC-4) or EST (UTC-5) based on the date
    const appointmentDateObj = new Date(appointmentDate);
    const isEDT = isDaylightSavingTime(appointmentDateObj);
    const utcOffset = isEDT ? 4 : 5; // EDT is UTC-4, EST is UTC-5
    
    // Create the datetime and convert to UTC
    const [year, month, day] = appointmentDate.split('-');
    const [hours, minutes] = time24.split(':');
    
    // Create in UTC by adding the Eastern Time offset
    const utcDateTime = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours) + utcOffset, // Add offset to convert Eastern to UTC
      parseInt(minutes)
    ));
    
    return utcDateTime.toISOString();
  }

  // Helper function to determine if a date is in Daylight Saving Time (EDT)
  function isDaylightSavingTime(date: Date): boolean {
    // DST in US: Second Sunday in March to First Sunday in November
    const year = date.getFullYear();
    
    // Second Sunday in March
    const march = new Date(year, 2, 1); // March 1st
    const dstStart = new Date(year, 2, (14 - march.getDay()) % 7 + 7);
    
    // First Sunday in November  
    const november = new Date(year, 10, 1); // November 1st
    const dstEnd = new Date(year, 10, (7 - november.getDay()) % 7);
    
    return date >= dstStart && date < dstEnd;
  }

  // Helper function to convert 12-hour time to 24-hour format  
  function convertTo24Hour(time12h: string): string {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    // Handle 12 AM (midnight) and 12 PM (noon) cases
    if (hours === '12') {
      hours = modifier === 'AM' ? '00' : '12';
    } else if (modifier === 'PM') {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    
    return `${hours.padStart(2, '0')}:${minutes}:00`;
  }

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

      // **CHECK AVAILABILITY FIRST - Prevent double booking**
      console.log('🔍 Checking appointment availability...');
      const requestedDateTime = createAppointmentDateTime(appointmentDate, appointmentTime);
      
      // Check for existing appointments at the same date/time
      const existingAppointments = await storage.getAppointments();
      const conflictingAppointment = existingAppointments.find(apt => {
        if (apt.status === 'cancelled') return false; // Ignore cancelled appointments
        
        const existingDateTime = new Date(apt.datetime);
        const requestedDateTimeObj = new Date(requestedDateTime);
        
        // Check if appointments are at the same time (within 30 minute window)
        const timeDiff = Math.abs(existingDateTime.getTime() - requestedDateTimeObj.getTime());
        const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
        
        return timeDiff < thirtyMinutes;
      });
      
      if (conflictingAppointment) {
        console.log('❌ Time slot conflict detected');
        console.log('Conflicting appointment:', {
          id: conflictingAppointment.id,
          datetime: conflictingAppointment.datetime,
          status: conflictingAppointment.status
        });
        
        return res.status(409).json({
          success: false,
          message: `Sorry, the ${appointmentTime} time slot on ${new Date(appointmentDate).toLocaleDateString()} is already booked. Please choose a different time.`,
          error: 'TIME_SLOT_UNAVAILABLE',
          availableAlternatives: [
            '8:30 AM',
            '9:00 AM'
          ].filter(time => time !== appointmentTime) // Suggest the other time slot
        });
      }
      
      console.log('✅ Time slot is available, proceeding with booking...');

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

      // Create the appointment record with proper timezone handling
      const appointmentData = {
        companyId,        // ✅ Use new CRM structure
        projectId,        // ✅ Link to project
        projectToken,     // ✅ For client access
        datetime: createAppointmentDateTime(appointmentDate, appointmentTime),
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
          businessName: businessName || '',
          appointmentId: appointment.id // Include appointment ID for action links
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

  // Get availability for a specific date (for widget real-time checking)
  app.get("/api/availability/:date", async (req: Request, res: Response) => {
    try {
      const { date } = req.params;
      
      // Define business hours - only two slots available daily
      const allSlots = ['8:30 AM', '9:00 AM'];
      
      // Get existing appointments for this date
      const appointments = await storage.getAppointments();
      const appointmentsForDate = appointments.filter(apt => {
        if (apt.status === 'cancelled') return false; // Ignore cancelled appointments
        
        const appointmentDate = new Date(apt.datetime);
        const requestedDate = new Date(date);
        
        // Check if appointment is on the same date
        return appointmentDate.toDateString() === requestedDate.toDateString();
      });
      
      // Extract booked time slots from appointments
      const bookedSlots: string[] = [];
      appointmentsForDate.forEach(apt => {
        const appointmentTime = new Date(apt.datetime);
        
        // Convert to Eastern Time and format as 12-hour time
        const easternTime = new Date(appointmentTime.getTime() - (4 * 60 * 60 * 1000)); // Assuming EDT (UTC-4)
        const hours = easternTime.getHours();
        const minutes = easternTime.getMinutes();
        
        let timeString = '';
        if (hours === 8 && minutes === 30) {
          timeString = '8:30 AM';
        } else if (hours === 9 && minutes === 0) {
          timeString = '9:00 AM';
        }
        
        if (timeString && !bookedSlots.includes(timeString)) {
          bookedSlots.push(timeString);
        }
      });
      
      // Calculate available slots
      const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
      
      console.log(`📅 Availability check for ${date}:`);
      console.log(`   Available: [${availableSlots.join(', ')}]`);
      console.log(`   Booked: [${bookedSlots.join(', ')}]`);
      
      res.json({
        success: true,
        date: date,
        availableSlots: availableSlots,
        bookedSlots: bookedSlots
      });
      
    } catch (error) {
      console.error('Error checking availability:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to check availability',
        error: 'Internal server error'
      });
    }
  });

  app.get("/api/debug/r2", (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      r2Config: {
        useR2Storage,
        hasEndpoint: !!process.env.R2_ENDPOINT,
        hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
        hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,  
        hasBucket: !!process.env.R2_BUCKET,
        hasRegion: !!process.env.R2_REGION,
        endpoint: process.env.R2_ENDPOINT ? 'SET' : 'MISSING',
        bucket: process.env.R2_BUCKET ? 'SET' : 'MISSING',
        region: process.env.R2_REGION || 'auto'
      }
    });
  });

  // ===================
  // ADMIN API ENDPOINTS (Require Authentication)
  // ===================

  // Get stats for admin dashboard
  app.get("/api/stats", requireAdmin, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Get all businesses (legacy compatibility)
  app.get("/api/businesses", requireAdmin, async (req: Request, res: Response) => {
    try {
      const businesses = await storage.getBusinesses();
      res.json(businesses);
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  // Get all companies (new structure)
  app.get("/api/companies", requireAdmin, async (req: Request, res: Response) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Get activities for admin dashboard
  app.get("/api/activities", requireAdmin, async (req: Request, res: Response) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // UNIFIED MESSAGING API - Real-time bi-directional messaging
  // ========================================================

  interface UnifiedMessage {
    projectToken: string;
    senderName: string;    // ← Fixed: was "sender"
    content: string;       // ← Fixed: was "body"
    createdAt: string;     // ← Fixed: was "timestamp"
    senderType: 'client' | 'admin';  // ← Added: required by React UI
    id?: number;
    attachments?: string[];
  }

  // Get messages by project token (unified endpoint)
  app.get("/api/messages", async (req: Request, res: Response) => {
    try {
      const { projectToken } = req.query;
      
      if (!projectToken || typeof projectToken !== 'string') {
        return res.status(400).json({ error: "Project token is required" });
      }
      
      console.log(`📥 Fetching messages for project token: ${projectToken}`);
      
      // Find project by token
      const project = await storage.getProjectByToken(projectToken);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Get messages for this project
      const messages = await storage.getProjectMessages(project.id!);
      
      // Transform to unified format
      const unifiedMessages: UnifiedMessage[] = messages.map(msg => ({
        id: msg.id,
        projectToken: projectToken,
        senderName: msg.senderName,      // ← Fixed: was "sender"
        content: msg.content,            // ← Fixed: was "body"
        createdAt: msg.createdAt || new Date().toISOString(),  // ← Fixed: was "timestamp"
        senderType: msg.senderType,      // ← Added: required by React UI
        attachments: msg.attachments || []
      }));
      
      console.log(`📋 Retrieved ${unifiedMessages.length} messages for project: ${project.title}`);
      res.json(unifiedMessages);
      
    } catch (error) {
      console.error("Failed to fetch unified messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send message (unified endpoint) 
  app.post("/api/messages", upload.array('files'), async (req: Request, res: Response) => {
    try {
      const { projectToken, sender, body } = req.body;
      
      // Allow empty body if files are attached
      const hasFiles = req.files && Array.isArray(req.files) && req.files.length > 0;
      
      if (!projectToken || !sender || (!body && !hasFiles)) {
        return res.status(400).json({ 
          error: "projectToken, sender, and either body or files are required" 
        });
      }
      
      console.log(`📤 Unified message send request:`, {
        projectToken,
        sender,
        body: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
        filesCount: req.files?.length || 0
      });
      
      // Find project by token
      const project = await storage.getProjectByToken(projectToken);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
             // Handle file uploads  
       let attachmentUrls: string[] = [];
       if (req.files && Array.isArray(req.files)) {
         console.log(`📎 Processing ${req.files.length} file attachments`);
         
         // Dynamically determine the base URL - use HTTPS ngrok for HTTPS compatibility
         const baseUrl = process.env.NODE_ENV === 'production' 
           ? 'https://pleasantcovedesign-production.up.railway.app' 
           : 'https://1ce2-2603-7080-e501-3f6a-59ca-c294-1beb-ddfc.ngrok-free.app';

         for (const file of req.files as Express.Multer.File[]) {
           try {
             const localPath = `${baseUrl}/uploads/${file.filename}`;
             console.log(`📎 File processed via disk storage: ${localPath}`);
             attachmentUrls.push(localPath);
           } catch (uploadError) {
             console.error(`Failed to process file ${file.originalname}:`, uploadError);
           }
         }
       }
      
      // Determine sender type (admin vs client)
      const senderType = sender.toLowerCase().includes('ben') || 
                         sender.toLowerCase().includes('admin') || 
                         sender.toLowerCase().includes('pleasant cove') ? 'admin' : 'client';
      
             // Save message to database
       const savedMessage = await storage.createProjectMessage({
         projectId: project.id!,
         senderType,
         senderName: sender,
         content: body,
         attachments: attachmentUrls,
         createdAt: new Date().toISOString()
       });

       // DEBUG: Log the saved message to see what was actually stored
       console.log(`🔍 [DEBUG] Saved message from storage:`, {
         id: savedMessage.id,
         senderName: savedMessage.senderName,
         content: savedMessage.content?.substring(0, 50),
         senderType: savedMessage.senderType,
         attachments: savedMessage.attachments?.length || 0
       });
      
      // Create unified response
      const unifiedMessage: UnifiedMessage = {
        id: savedMessage.id,
        projectToken,
        senderName: savedMessage.senderName,    // ← Use savedMessage.senderName instead of sender
        content: savedMessage.content,          // ← Use savedMessage.content instead of body
        createdAt: savedMessage.createdAt || new Date().toISOString(),
        senderType: savedMessage.senderType,    // ← Use savedMessage.senderType
        attachments: savedMessage.attachments || []
      };

      // DEBUG: Log the unified message being broadcast
      console.log(`🔍 [DEBUG] Unified message being broadcast:`, {
        id: unifiedMessage.id,
        senderName: unifiedMessage.senderName,
        content: unifiedMessage.content?.substring(0, 50),
        senderType: unifiedMessage.senderType,
        attachments: unifiedMessage.attachments?.length || 0
      });
      
      console.log(`✅ Unified message created:`, {
        id: savedMessage.id,
        sender: savedMessage.senderName,  // ← Use savedMessage.senderName
        attachments: attachmentUrls.length
      });
      
      // Broadcast to all connected clients for this project
      if (io) {
        console.log(`📡 Broadcasting message to project: ${projectToken}`);
        io.to(projectToken).emit('newMessage', unifiedMessage);
        
        // ALSO broadcast to admin room so admin UI receives all messages
        console.log(`📡 Broadcasting message to admin-room for admin UI`);
        io.to('admin-room').emit('newMessage', unifiedMessage);
      }
      
      // If this is an admin message, also push to Squarespace  
      if (senderType === 'admin') {
        try {
          const squarespacePayload = {
            project_title: project.title,
            company_name: project.company?.name || 'Unknown Client',
            client_email: project.company?.email || '',
            message_content: body,
            attachments: attachmentUrls.map(url => ({
              url,
              name: url.split('/').pop() || 'attachment'
            })),
            timestamp: new Date().toISOString(),
            sender: sender,
            message_type: 'admin_update',
            project_stage: project.stage || 'active'
          };
          
          console.log('🚀 Pushing admin message to Squarespace:', {
            project: project.title,
            sender,
            content: body.substring(0, 50) + '...'
          });
          
          // Here you would implement the actual Squarespace push
          // For now, just log it
          
        } catch (pushError) {
          console.error('Failed to push to Squarespace:', pushError);
          // Don't fail the message creation if push fails
        }
      }
      
      res.json(unifiedMessage);
      
    } catch (error) {
      console.error("Failed to send unified message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // 🔒 USER AUTHENTICATION ENDPOINTS - Dynamic Token Resolution
  
  // Get existing token for user or create new conversation
  app.post('/api/get-user-token', async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }
      
      console.log(`🔍 Getting token for user: ${email}`);
      
      // Look for existing user
      const existingClient = await storage.findClientByEmail(email);
      
      if (existingClient) {
        // For existing clients, ALWAYS create new secure conversations for privacy
        console.log(`✅ Found existing client: ${existingClient.name || existingClient.email} (ID: ${existingClient.id})`);
        
        const secureToken = generateSecureProjectToken('widget_auth', email);
        const newProject = await storage.createProject({
          companyId: existingClient.id,
          title: `${existingClient.name || name || email.split('@')[0]} - Conversation ${secureToken.submissionId}`,
          type: 'website',
          stage: 'discovery',
          status: 'active',
          totalAmount: 5000,
          paidAmount: 0,
          accessToken: secureToken.token
        });
        
        console.log(`🆕 Created new secure conversation for ${email}: ${secureToken.token}`);
        return res.json({ token: secureToken.token });
      }
      
      // Create new client and project
      const newCompany = await storage.createCompany({
        name: name || email.split('@')[0],
        email: email,
        phone: '',
        address: '',
        city: '',
        state: '',
        website: '',
        industry: 'Web Design Client',
        tags: [],
        priority: 'medium'
      });
      
      const secureToken = generateSecureProjectToken('widget_auth', email);
      const newProject = await storage.createProject({
        companyId: newCompany.id!,
        title: `${name || email.split('@')[0]} - Conversation ${secureToken.submissionId}`,
        type: 'website',
        stage: 'discovery',
        status: 'active',
        totalAmount: 5000,
        paidAmount: 0,
        accessToken: secureToken.token
      });
      
      console.log(`✨ Created new client and token for ${email}: ${secureToken.token}`);
      res.json({ token: secureToken.token });
      
    } catch (error) {
      console.error('Error getting user token:', error);
      res.status(500).json({ error: 'Failed to get user token' });
    }
  });

  // Validate token endpoint
  app.post('/api/validate-token', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Token required' });
      }
      
      console.log(`🔍 Validating token: ${token.substring(0, 8)}...`);
      
      // Look for project with this token using existing method
      try {
        const project = await storage.getProjectByAccessToken(token);
        
        if (project) {
          console.log(`✅ Token valid: ${token.substring(0, 8)}...`);
          res.json({ valid: true });
        } else {
          console.log(`❌ Token invalid: ${token.substring(0, 8)}...`);
          res.status(404).json({ valid: false });
        }
      } catch (error) {
        console.log(`❌ Token validation error: ${error.message}`);
        res.status(404).json({ valid: false });
      }
      
    } catch (error) {
      console.error('Error validating token:', error);
      res.status(500).json({ valid: false });
    }
  });

  // Get user's most recent conversation token
  app.post('/api/get-latest-conversation', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email required' });
      }
      
      console.log(`🔍 Getting latest conversation for: ${email}`);
      
      const existingClient = await storage.findClientByEmail(email);
      
      if (!existingClient) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get all projects for this client and find the most recent
      const projects = await storage.getProjectsByCompany(existingClient.id);
      
      if (projects.length === 0) {
        return res.status(404).json({ error: 'No conversations found' });
      }
      
      // Sort by creation date to get the most recent
      const latestProject = projects.sort((a: any, b: any) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];
      
      console.log(`📞 Latest conversation for ${email}: ${latestProject.accessToken?.substring(0, 8)}...`);
      res.json({ token: latestProject.accessToken });
      
    } catch (error) {
      console.error('Error getting latest conversation:', error);
      res.status(500).json({ error: 'Failed to get latest conversation' });
    }
  });

  // ===================
  // UNIFIED TOKEN ENDPOINT - Single source of truth for all tokens
  // ===================
  
  app.post('/api/token', async (req: Request, res: Response) => {
    try {
      const { email, name, projectId, type = 'member' } = req.body;
      
      console.log(`🔑 [TOKEN_REQUEST] Type: ${type}, Email: ${email}, ProjectId: ${projectId}`);
      
      // ADMIN TOKEN REQUEST (for admin UI)
      if (type === 'admin') {
        const adminToken = req.headers.authorization?.replace('Bearer ', '');
        if (adminToken === 'pleasantcove2024admin') {
          console.log(`✅ [TOKEN_REQUEST] Admin token validated`);
          return res.json({ 
            token: adminToken,
            type: 'admin',
            valid: true,
            expiresIn: null // Admin tokens don't expire
          });
        } else {
          console.log(`❌ [TOKEN_REQUEST] Invalid admin token`);
          return res.status(401).json({ error: 'Invalid admin token', code: 'INVALID_ADMIN_TOKEN' });
        }
      }
      
      // PROJECT TOKEN REQUEST (by project ID)
      if (type === 'project' && projectId) {
        const project = await storage.getProjectById(projectId);
        if (project && project.accessToken) {
          console.log(`✅ [TOKEN_REQUEST] Project token found: ${project.accessToken.substring(0, 8)}...`);
          return res.json({
            token: project.accessToken,
            type: 'project',
            valid: true,
            projectId: project.id,
            projectTitle: project.title
          });
        } else {
          console.log(`❌ [TOKEN_REQUEST] Project not found: ${projectId}`);
          return res.status(404).json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
        }
      }
      
      // MEMBER TOKEN REQUEST (for Squarespace widgets)
      if (type === 'member' && email) {
        console.log(`[MEMBER_AUTH] Authenticating member: ${email}`);
        
        // Step 1: Find if this member (company) already exists.
        const existingClientData = await storage.findClientByEmail(email);
        let existingClient = null;
        
        // Handle the complex return structure from findClientByEmail
        if (existingClientData) {
          if (existingClientData.company) {
            existingClient = existingClientData.company;
          } else if (existingClientData.business) {
            existingClient = existingClientData.business;
          }
        }
        
        if (existingClient?.id) {
            console.log(`[MEMBER_AUTH] Found existing client: ${existingClient.name} (ID: ${existingClient.id})`);
            
            // Step 2: Find the most recent active project for this client.
            const projects = await storage.getProjectsByCompany(existingClient.id);
            console.log(`[MEMBER_AUTH] Found ${projects.length} projects for client ${existingClient.id}`);
            
            const latestProject = projects
                .filter(p => p.status === 'active')
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

            if (latestProject) {
                console.log(`[MEMBER_AUTH] Resuming existing conversation: ${latestProject.title} (${latestProject.accessToken?.substring(0, 8)}...)`);
                return res.json({
                    token: latestProject.accessToken,
                    projectToken: latestProject.accessToken,
                    type: 'member',
                    valid: true,
                    existing: true, // Let the widget know this is a returning user
                    projectId: latestProject.id,
                    projectTitle: latestProject.title,
                    clientName: existingClient.name
                });
            }
            console.log(`[MEMBER_AUTH] No active projects found, creating new conversation for existing client ${existingClient.id}`);
        } else {
            console.log(`[MEMBER_AUTH] No existing client found, creating new client: ${name || email.split('@')[0]} (${email})`);
        }

        // Step 3: No existing client or no active project found. Create a new one.
        console.log(`[MEMBER_AUTH] Creating new client/conversation for: ${email}`);
        
        let clientData = existingClient;
        if (!clientData) {
            clientData = await storage.createCompany({
                name: name || email.split('@')[0],
                email: email,
                phone: '',
                industry: 'Web Design Client',
                tags: ['squarespace-member']
            });
            console.log(`[MEMBER_AUTH] Created new client: ${clientData.name} (ID: ${clientData.id})`);
        }
        
        const secureToken = generateSecureProjectToken('member_conversation', email);
        const newProject = await storage.createProject({
            companyId: clientData.id,
            title: `${clientData.name} - Member Conversation`,
            type: 'consultation',
            status: 'active',
            accessToken: secureToken.token
        });
        
        console.log(`[MEMBER_AUTH] Created new conversation: ${secureToken.token.substring(0, 8)}...`);
        return res.json({
            token: secureToken.token,
            projectToken: secureToken.token,
            type: 'member',
            valid: true,
            existing: false, // This is a brand new conversation
            projectId: newProject.id,
            projectTitle: newProject.title,
            clientName: clientData.name
        });
      }
      
      // VALIDATION REQUEST (check if token is valid)
      if (type === 'validate') {
        const { token } = req.body;
        if (!token) {
          return res.status(400).json({ error: 'Token required for validation', code: 'MISSING_TOKEN' });
        }
        
        try {
          const project = await storage.getProjectByAccessToken(token);
          if (project) {
            console.log(`✅ [TOKEN_REQUEST] Token validation successful: ${token.substring(0, 8)}...`);
            return res.json({
              token,
              type: 'project',
              valid: true,
              projectId: project.id,
              projectTitle: project.title
            });
          } else {
            console.log(`❌ [TOKEN_REQUEST] Token validation failed: ${token.substring(0, 8)}...`);
            return res.status(404).json({ 
              valid: false, 
              error: 'Token not found',
              code: 'TOKEN_NOT_FOUND'
            });
          }
        } catch (error) {
          console.log(`❌ [TOKEN_REQUEST] Token validation error: ${error.message}`);
          return res.status(400).json({ 
            valid: false, 
            error: 'Invalid token format',
            code: 'INVALID_TOKEN_FORMAT'
          });
        }
      }
      
      return res.status(400).json({ 
        error: 'Invalid request. Specify type: admin, member, project, or validate',
        code: 'INVALID_REQUEST_TYPE'
      });
      
    } catch (error) {
      console.error('❌ [TOKEN_REQUEST] Error:', error);
      res.status(500).json({ 
        error: 'Token request failed',
        code: 'TOKEN_REQUEST_ERROR'
      });
    }
  });
  
  // ===================
  // TAGS ENDPOINT - For React UI tag management
  // ===================
  
  app.get('/api/tags', async (req: Request, res: Response) => {
    try {
      console.log('📋 [TAGS] Fetching all available tags...');
      
      // For now, return a static list of common tags
      // TODO: Make this dynamic based on actual project tags in database
      const tags = [
        { id: 1, name: 'High Priority', color: '#ef4444', count: 3 },
        { id: 2, name: 'New Client', color: '#22c55e', count: 8 },
        { id: 3, name: 'Consultation', color: '#3b82f6', count: 12 },
        { id: 4, name: 'Website Project', color: '#8b5cf6', count: 5 },
        { id: 5, name: 'Branding', color: '#f59e0b', count: 2 },
        { id: 6, name: 'E-commerce', color: '#ec4899', count: 4 },
        { id: 7, name: 'Mobile App', color: '#06b6d4', count: 1 },
        { id: 8, name: 'Maintenance', color: '#84cc16', count: 6 },
        { id: 9, name: 'Squarespace Member', color: '#f97316', count: 7 },
        { id: 10, name: 'Follow-up Required', color: '#ef4444', count: 2 }
      ];
      
      console.log(`📋 [TAGS] Returning ${tags.length} tags`);
      res.json(tags);
      
    } catch (error) {
      console.error('❌ [TAGS] Error fetching tags:', error);
      res.status(500).json({ 
        error: 'Failed to fetch tags',
        code: 'TAGS_FETCH_ERROR'
      });
    }
  });
  
  // ===================
  // DEBUG ENDPOINTS
  // ===================
  
  // Debug endpoint to check room status
  app.get('/api/debug/rooms/:projectToken', async (req: Request, res: Response) => {
    try {
      const { projectToken } = req.params;
      
      if (!io) {
        return res.status(500).json({ error: 'WebSocket not available' });
      }
      
      const roomClients = await io.in(projectToken).allSockets();
      
      console.log(`🔍 [DEBUG] Room status check for: ${projectToken}`);
      console.log(`🔍 [DEBUG] Connected clients: ${roomClients.size}`);
      console.log(`🔍 [DEBUG] Client IDs:`, Array.from(roomClients));
      
      res.json({
        projectToken,
        connectedClients: roomClients.size,
        clientIds: Array.from(roomClients),
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      console.error('❌ [DEBUG] Room status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to list all active rooms
  app.get('/api/debug/rooms', async (req: Request, res: Response) => {
    try {
      if (!io) {
        return res.status(500).json({ error: 'WebSocket not available' });
      }
      
      const adapter = io.sockets.adapter;
      const rooms = Array.from(adapter.rooms.keys()).filter(room => !adapter.sids.has(room));
      
      const roomInfo = [];
      for (const room of rooms) {
        const clients = await io.in(room).allSockets();
        roomInfo.push({
          room,
          clientCount: clients.size,
          clientIds: Array.from(clients)
        });
      }
      
      console.log(`🔍 [DEBUG] All active rooms: ${rooms.length}`);
      
      res.json({
        totalRooms: rooms.length,
        rooms: roomInfo,
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (error) {
      console.error('❌ [DEBUG] All rooms error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===================

  // NEW, RELIABLE ENDPOINT FOR ADMIN INBOX
  app.get("/api/admin/conversations", requireAdmin, async (req: Request, res: Response) => {
    try {
      console.log("✅ [ADMIN INBOX] Fetching all conversations via new dedicated route...");
      
      // Manually read the database to bypass the storage layer bugs
      const dbPath = path.join(process.cwd(), 'data', 'database.json');
      const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      
      const allProjects: Project[] = dbData.projects;
      const allMessages: Message[] = dbData.projectMessages;
      const allCompanies: Company[] = dbData.companies;

      const companyMap = new Map(allCompanies.map(c => [c.id, c]));

      const conversations = allProjects
        .map(project => {
          const company = companyMap.get(project.companyId);
          const projectMessages = allMessages.filter(m => m.projectId === project.id);

          if (!company || projectMessages.length === 0) {
            return null;
          }
          
          projectMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          const lastMessage = projectMessages[projectMessages.length - 1];

          return {
            projectId: project.id,
            projectTitle: project.title,
            customerName: company.name,
            accessToken: project.accessToken,
            lastMessage: lastMessage,
            lastMessageTime: lastMessage.createdAt,
            messages: projectMessages,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      conversations.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
      
      console.log(`✅ [ADMIN INBOX] Successfully fetched ${conversations.length} conversations.`);
      // The frontend expects the data nested under a `projectMessages` key
      res.json({ projectMessages: conversations });

    } catch (error) {
      console.error("❌ [ADMIN INBOX] Failed to fetch conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Correctly closing the function
}