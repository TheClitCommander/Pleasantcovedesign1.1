import { db } from "./db.js";
import { PostgreSQLStorage } from "./postgres-storage.js";
import type { Business, NewBusiness, Activity, NewActivity, Company, NewCompany, Project, NewProject, ProjectMessage, ProjectFile } from "../shared/schema.js";

// Mock schema objects for the in-memory database
const businessesTable = { tableName: 'businesses' };
const companiesTable = { tableName: 'companies' };
const projectsTable = { tableName: 'projects' };
const projectMessagesTable = { tableName: 'project_messages' };
const projectFilesTable = { tableName: 'project_files' };
const activitiesTable = { tableName: 'activities' };
const campaignsTable = { tableName: 'campaigns' };
const templatesTable = { tableName: 'templates' };
const appointmentsTable = { tableName: 'appointments' };
const progressEntriesTable = { tableName: 'progress_entries' };

export class Storage {
  // Business operations (legacy compatibility)
  async createBusiness(data: any): Promise<Business> {
    const results: any[] = db.insert(businessesTable).values(data).returning();
    return results[0] as Business;
  }

  async getBusinesses(tagFilter?: string): Promise<Business[]> {
    let results: any[] = db.select().from(businessesTable).orderBy({});
    
    // Apply tag filtering if provided
    if (tagFilter) {
      results = results.filter(business => 
        business.tags && business.tags.includes(tagFilter)
      );
    }
    
    return results as Business[];
  }

  async getBusinessById(id: number): Promise<Business | null> {
    const businesses: any[] = db.select().from(businessesTable).where({ id });
    return (businesses[0] as Business) || null;
  }

  async updateBusiness(id: number, data: Partial<Business>): Promise<Business> {
    const results: any[] = db.update(businessesTable).set(data).where({ id }).returning();
    return results[0] as Business;
  }

  async deleteBusiness(id: number): Promise<void> {
    db.delete(businessesTable).where({ id });
  }

  // Company operations
  async createCompany(data: NewCompany): Promise<Company> {
    const results: any[] = db.insert(companiesTable).values(data).returning();
    return results[0] as Company;
  }

  async getCompanies(tagFilter?: string): Promise<Company[]> {
    let results: any[] = db.select().from(companiesTable).orderBy({});
    
    // Apply tag filtering if provided
    if (tagFilter) {
      results = results.filter(company => 
        company.tags && company.tags.includes(tagFilter)
      );
    }
    
    return results as Company[];
  }

  async getCompanyById(id: number): Promise<Company | null> {
    const companies: any[] = db.select().from(companiesTable).where({ id });
    return (companies[0] as Company) || null;
  }

  async updateCompany(id: number, data: Partial<Company>): Promise<Company | null> {
    const results: any[] = db.update(companiesTable).set(data).where({ id }).returning();
    return (results[0] as Company) || null;
  }

  async deleteCompany(id: number): Promise<void> {
    db.delete(companiesTable).where({ id });
  }

  // Project operations
  async createProject(data: NewProject): Promise<Project> {
    const results: any[] = db.insert(projectsTable).values(data).returning();
    return results[0] as Project;
  }

  async getProjects(filters?: {
    status?: string;
    stage?: string;
    type?: string;
    companyId?: number;
  }): Promise<Project[]> {
    let results: any[] = db.select().from(projectsTable).orderBy({});
    
    if (filters) {
      if (filters.status) {
        results = results.filter(project => project.status === filters.status);
      }
      if (filters.stage) {
        results = results.filter(project => project.stage === filters.stage);
      }
      if (filters.type) {
        results = results.filter(project => project.type === filters.type);
      }
      if (filters.companyId) {
        results = results.filter(project => project.companyId === filters.companyId);
      }
    }
    
    return results as Project[];
  }

  async getProjectById(id: number): Promise<Project | null> {
    const projects: any[] = db.select().from(projectsTable).where({ id });
    return (projects[0] as Project) || null;
  }

  async getProjectsByCompany(companyId: number, statusFilter?: string): Promise<Project[]> {
    let results: any[] = db.select().from(projectsTable).where({ companyId });
    
    if (statusFilter) {
      results = results.filter(project => project.status === statusFilter);
    }
    
    return results as Project[];
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project | null> {
    const results: any[] = db.update(projectsTable).set(data).where({ id }).returning();
    return (results[0] as Project) || null;
  }

  async deleteProject(id: number): Promise<void> {
    db.delete(projectsTable).where({ id });
  }

  // Activity operations (updated for project awareness)
  async createActivity(data: NewActivity): Promise<Activity> {
    const results: any[] = db.insert(activitiesTable).values(data).returning();
    return results[0] as Activity;
  }

  async getActivities(): Promise<Activity[]> {
    const results: any[] = db.select().from(activitiesTable).orderBy({});
    return results as Activity[];
  }

  async getActivitiesByBusinessId(businessId: number): Promise<Activity[]> {
    const results: any[] = db.select().from(activitiesTable).where({ businessId });
    return results as Activity[];
  }

  async getActivitiesByCompany(companyId: number): Promise<Activity[]> {
    const results: any[] = db.select().from(activitiesTable).where({ companyId });
    return results as Activity[];
  }

  async getActivitiesByProject(projectId: number): Promise<Activity[]> {
    const results: any[] = db.select().from(activitiesTable).where({ projectId });
    return results as Activity[];
  }

  // Campaign operations
  async getCampaigns() {
    const results: any[] = db.select().from(campaignsTable).orderBy({});
    return results;
  }

  async createCampaign(data: any) {
    const results: any[] = db.insert(campaignsTable).values(data).returning();
    return results[0];
  }

  // Template operations
  async getTemplates() {
    const results: any[] = db.select().from(templatesTable).orderBy({});
    return results;
  }

  async createTemplate(data: any) {
    const results: any[] = db.insert(templatesTable).values(data).returning();
    return results[0];
  }

  // Appointment operations (updated for project awareness)
  async getAppointments() {
    const results: any[] = db.select().from(appointmentsTable).orderBy({});
    return results;
  }

  async createAppointment(data: any) {
    const results: any[] = db.insert(appointmentsTable).values(data).returning();
    return results[0];
  }

  // New appointment methods for unified backend
  async getAppointmentsByDateTime(appointmentDate: string, appointmentTime: string) {
    const results: any[] = db.select().from(appointmentsTable).orderBy({});
    return results.filter(apt => 
      apt.appointmentDate === appointmentDate && 
      apt.appointmentTime === appointmentTime &&
      apt.status !== 'cancelled'
    );
  }

  async getAppointmentsByDate(date: string) {
    const results: any[] = db.select().from(appointmentsTable).orderBy({});
    return results.filter(apt => apt.appointmentDate === date);
  }

  async getAllAppointments() {
    const results: any[] = db.select().from(appointmentsTable).orderBy({});
    return results.sort((a, b) => {
      const dateA = new Date(`${a.appointmentDate} ${a.appointmentTime}`);
      const dateB = new Date(`${b.appointmentDate} ${b.appointmentTime}`);
      return dateB.getTime() - dateA.getTime();
    });
  }

  async updateAppointmentStatus(id: number, status: string) {
    const results: any[] = db.update(appointmentsTable).set({ status }).where({ id }).returning();
    return results[0] || null;
  }

  async getAppointmentsByBusinessId(businessId: number) {
    const results: any[] = db.select().from(appointmentsTable).where({ businessId });
    return results;
  }

  async getAppointmentsByCompany(companyId: number) {
    const results: any[] = db.select().from(appointmentsTable).where({ companyId });
    return results;
  }

  async getAppointmentsByProject(projectId: number) {
    const results: any[] = db.select().from(appointmentsTable).where({ projectId });
    return results;
  }

  async getAppointmentBySquarespaceId(squarespaceId: string) {
    const results: any[] = db.select().from(appointmentsTable).where({ squarespaceId });
    return results[0] || null;
  }

  async updateAppointment(id: number, data: any) {
    const results: any[] = db.update(appointmentsTable).set(data).where({ id }).returning();
    return results[0];
  }

  async getAppointmentById(id: number) {
    const results: any[] = db.select().from(appointmentsTable).where({ id });
    return results[0] || null;
  }

  async deleteAppointment(id: number) {
    db.delete(appointmentsTable).where({ id });
  }

  // ===================
  // ACUITY APPOINTMENT OPERATIONS
  // ===================

  async getAppointmentsByProjectToken(projectToken: string) {
    const results: any[] = db.select().from(appointmentsTable).where({ projectToken });
    return results;
  }

  async getAppointmentByAcuityId(acuityId: string) {
    const results: any[] = db.select().from(appointmentsTable).where({ acuityId });
    return results[0] || null;
  }

  async createAcuityAppointment(appointmentData: any, projectToken?: string) {
    // Prevent duplicates by checking Acuity ID
    const existing = await this.getAppointmentByAcuityId(appointmentData.acuityId);
    if (existing) {
      console.log(`🔄 Acuity appointment ${appointmentData.acuityId} already exists, updating...`);
      return await this.updateAppointment(existing.id, {
        ...appointmentData,
        projectToken,
        updatedAt: new Date().toISOString()
      });
    }

    // Create new appointment
    const data = {
      ...appointmentData,
      projectToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const results: any[] = db.insert(appointmentsTable).values(data).returning();
    return results[0];
  }

  async findClientByEmail(email: string): Promise<{ 
    company?: Company, 
    project?: Project, 
    business?: Business 
  } | null> {
    console.log(`🔍 Storage: Searching for client with email: ${email}`);
    
    // Try to find by company email first (new system)
    // For in-memory database, we need to filter manually since the WHERE clause doesn't work properly
    const allCompanies: any[] = db.select().from(companiesTable).orderBy({});
    console.log(`🔍 Storage: Found ${allCompanies.length} total companies`);
    console.log(`🔍 Storage: All company emails:`, allCompanies.map(c => c.email));
    
    const companies = allCompanies.filter(c => c.email === email);
    console.log(`🔍 Storage: Filtered companies for ${email}:`, companies.length);
    
    if (companies.length > 0) {
      const company = companies[0] as Company;
      console.log(`✅ Storage: Found matching company: ${company.name} (${company.email})`);
      
      // Get the first project for this company
      const allProjects: any[] = db.select().from(projectsTable).orderBy({});
      const projects = allProjects.filter(p => p.companyId === company.id);
      const project = projects[0] as Project;
      
      return { company, project };
    }

    // Fallback to business table (legacy system)
    const allBusinesses: any[] = db.select().from(businessesTable).orderBy({});
    console.log(`🔍 Storage: Found ${allBusinesses.length} total businesses`);
    console.log(`🔍 Storage: All business emails:`, allBusinesses.map(b => b.email));
    
    const businesses = allBusinesses.filter(b => b.email === email);
    console.log(`🔍 Storage: Filtered businesses for ${email}:`, businesses.length);
    
    if (businesses.length > 0) {
      const business = businesses[0] as Business;
      console.log(`✅ Storage: Found matching business: ${business.name} (${business.email})`);
      return { business: business };
    }

    console.log(`❌ Storage: No client found for email: ${email}`);
    return null;
  }

  // Progress tracking operations
  async getProgressEntries() {
    const results: any[] = db.select().from(progressEntriesTable).orderBy({});
    return results;
  }

  async getProgressEntriesByBusinessId(businessId: number) {
    const results: any[] = db.select().from(progressEntriesTable).where({ businessId });
    return results;
  }

  async createProgressEntry(data: any) {
    const results: any[] = db.insert(progressEntriesTable).values(data).returning();
    return results[0];
  }

  // Public progress entries (for client viewing)
  async getPublicProgressEntries(businessId: number) {
    const results: any[] = db.select().from(progressEntriesTable).where({ businessId });
    return results;
  }

  // Availability and scheduling
  async getAvailabilityConfig() {
    return []; // Simplified for now
  }

  async getBlockedDates() {
    return []; // Simplified for now
  }

  async createBlockedDate(data: any) {
    return { id: Date.now() }; // Simplified for now
  }

  // Statistics and analytics
  async getStats() {
    const businesses = await this.getBusinesses();
    const activities = await this.getActivities();
    
    // Calculate stage statistics
    const stageStats = businesses.reduce((acc, business) => {
      acc[business.stage] = (acc[business.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate revenue metrics
    const soldBusinesses = businesses.filter(b => b.stage === 'sold' || b.stage === 'delivered');
    const totalRevenue = soldBusinesses.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const paidRevenue = soldBusinesses.reduce((sum, b) => sum + (b.paidAmount || 0), 0);

    // Lead quality metrics
    const highScoreLeads = businesses.filter(b => (b.score || 0) >= 80).length;
    const averageScore = businesses.reduce((sum, b) => sum + (b.score || 0), 0) / businesses.length || 0;

    // Activity metrics
    const recentActivities = activities.filter(a => {
      if (!a.createdAt) return false;
      const activityDate = new Date(a.createdAt);
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return activityDate > dayAgo;
    });

    return {
      totalLeads: businesses.length,
      totalRevenue,
      paidRevenue,
      pendingRevenue: totalRevenue - paidRevenue,
      averageScore: Math.round(averageScore),
      highScoreLeads,
      stageStats,
      recentActivityCount: recentActivities.length,
      conversionRate: businesses.length > 0 ? (soldBusinesses.length / businesses.length * 100).toFixed(1) : 0
    };
  }

  // Search and filtering
  async searchBusinesses(query: string) {
    const businesses = await this.getBusinesses();
    const lowerQuery = query.toLowerCase();
    
    return businesses.filter(b => 
      b.name?.toLowerCase().includes(lowerQuery) ||
      b.email?.toLowerCase().includes(lowerQuery) ||
      b.phone?.toLowerCase().includes(lowerQuery) ||
      b.businessType?.toLowerCase().includes(lowerQuery)
    );
  }

  async getBusinessesByStage(stage: string) {
    const businesses = await this.getBusinesses();
    return businesses.filter(b => b.stage === stage);
  }

  async getBusinessesByPriority(priority: string) {
    const businesses = await this.getBusinesses();
    return businesses.filter(b => b.priority === priority)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  // Get all unique tags from businesses
  async getAllTags(): Promise<string[]> {
    const businesses = await this.getBusinesses();
    const allTags = new Set<string>();
    
    businesses.forEach(business => {
      if (business.tags && Array.isArray(business.tags)) {
        business.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    return Array.from(allTags).sort();
  }

  // Bulk operations
  async updateBusinessStage(businessId: number, stage: string) {
    return await this.updateBusiness(businessId, { stage });
  }

  async updateBusinessScore(businessId: number, score: number) {
    return await this.updateBusiness(businessId, { score });
  }

  async updateBusinessPriority(businessId: number, priority: string) {
    return await this.updateBusiness(businessId, { priority });
  }

  // ===================
  // PROJECT MESSAGE OPERATIONS
  // ===================

  async getProjectMessages(projectId: number): Promise<ProjectMessage[]> {
    const results: any[] = db.select().from(projectMessagesTable).where({ projectId });
    return results as ProjectMessage[];
  }

  async createProjectMessage(data: Omit<ProjectMessage, 'id'>): Promise<ProjectMessage> {
    const results: any[] = db.insert(projectMessagesTable).values(data).returning();
    return results[0] as ProjectMessage;
  }

  async updateProjectMessage(id: number, data: Partial<ProjectMessage>): Promise<ProjectMessage | null> {
    const results: any[] = db.update(projectMessagesTable).set(data).where({ id }).returning();
    return (results[0] as ProjectMessage) || null;
  }

  async deleteProjectMessage(id: number): Promise<void> {
    db.delete(projectMessagesTable).where({ id });
  }

  // Alias for createProjectMessage (for compatibility)
  async addMessage(data: {
    projectId: number;
    senderType: 'client' | 'admin';
    senderName: string;
    content: string;
    attachments?: string[];
  }): Promise<ProjectMessage> {
    const messageData = {
      ...data,
      attachments: data.attachments || [],
      createdAt: new Date().toISOString()
    };
    return this.createProjectMessage(messageData);
  }

  // ===================
  // PROJECT FILE OPERATIONS
  // ===================

  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    const results: any[] = db.select().from(projectFilesTable).where({ projectId });
    return results as ProjectFile[];
  }

  async createProjectFile(data: Omit<ProjectFile, 'id'>): Promise<ProjectFile> {
    const results: any[] = db.insert(projectFilesTable).values(data).returning();
    return results[0] as ProjectFile;
  }

  async updateProjectFile(id: number, data: Partial<ProjectFile>): Promise<ProjectFile | null> {
    const results: any[] = db.update(projectFilesTable).set(data).where({ id }).returning();
    return (results[0] as ProjectFile) || null;
  }

  async deleteProjectFile(id: number): Promise<void> {
    db.delete(projectFilesTable).where({ id });
  }

  // ===================
  // CLIENT PORTAL OPERATIONS
  // ===================

  async getProjectByToken(accessToken: string): Promise<(Project & { company: Company }) | null> {
    const projectResults: any[] = db.select().from(projectsTable).where({ accessToken });
    const project = projectResults[0] as Project;
    
    if (!project) {
      return null;
    }

    // Get company information
    const companyResults: any[] = db.select().from(companiesTable).where({ id: project.companyId });
    const company = companyResults[0] as Company;

    return {
      ...project,
      company
    };
  }

  // Alias for compatibility with existing code
  async getProjectByAccessToken(accessToken: string): Promise<Project | null> {
    const projectResults: any[] = db.select().from(projectsTable).where({ accessToken });
    return (projectResults[0] as Project) || null;
  }

  async getProjectSummaryByToken(accessToken: string): Promise<{
    project: Project;
    company: Company;
    messages: ProjectMessage[];
    files: ProjectFile[];
    activities: Activity[];
  } | null> {
    const projectData = await this.getProjectByToken(accessToken);
    
    if (!projectData) {
      return null;
    }

    const { company, ...project } = projectData;
    
    // Get all related data
    const messages = await this.getProjectMessages(project.id!);
    const files = await this.getProjectFiles(project.id!);
    const activities = await this.getActivitiesByProject(project.id!);

    return {
      project,
      company,
      messages,
      files,
      activities: activities || []
    };
  }

  // ===================
  // NEW UNIFIED CONVERSATION LOADER
  // ===================
  async getAllConversations() {
    console.log("🔄 [STORAGE] Getting all conversations for admin inbox...");
    
    const projects = await this.getProjects({});
    const companies = await this.getCompanies();
    
    // Get all project messages
    const allProjectMessages: any[] = [];
    for (const project of projects) {
      if (project.id) {
        const projectMessages = await this.getProjectMessages(project.id);
        allProjectMessages.push(...projectMessages);
      }
    }
    const messages = allProjectMessages;

    const companyMap = new Map(companies.map(c => [c.id, c]));

    const conversations = projects
      .map(project => {
        const company = companyMap.get(project.companyId);
        const projectMessages = messages.filter(m => m.projectId === project.id);

        if (!company || projectMessages.length === 0) {
          return null;
        }
        
        projectMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return {
          projectId: project.id,
          projectTitle: project.title,
          customerName: company.name,
          accessToken: project.accessToken,
          lastMessage: projectMessages[projectMessages.length - 1],
          lastMessageTime: projectMessages[projectMessages.length - 1].createdAt,
          messages: projectMessages,
        };
      })
      .filter(Boolean); // Remove null entries for projects with no messages or company

    conversations.sort((a, b) => {
      if (!a || !b) return 0;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
    
    console.log(`✅ [STORAGE] Returning ${conversations.length} formatted conversations.`);
    return conversations;
  }
}

// Export singleton instance
// Initialize storage based on environment
function createStorage() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    console.log('🐘 Using PostgreSQL storage (persistent)');
    return new PostgreSQLStorage(databaseUrl);
  } else {
    console.log('💾 Using in-memory storage (development)');
    return new Storage();
  }
}

export const storage = createStorage();
Object.freeze(storage); 