// In-memory database implementation for quick development
// This avoids SQLite compilation issues and gets us running fast

import fs from 'fs';
import path from 'path';
import { Company, Project, Message, ProjectFile, Activity } from '../shared/schema.js';

// Persistent storage file paths
const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface Business {
  id: number;
  name: string;
  email?: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  businessType: string;
  stage: string;
  website?: string;
  notes?: string;
  score?: number;
  priority?: string;
  tags?: string[];
  lastContactDate?: string;
  scheduledTime?: string;
  appointmentStatus?: string;
  paymentStatus?: string;
  totalAmount?: number;
  paidAmount?: number;
  stripeCustomerId?: string;
  stripePaymentLinkId?: string;
  lastPaymentDate?: string;
  paymentNotes?: string;
  createdAt?: string;
}

interface Campaign {
  id: number;
  name: string;
  businessType: string;
  status: string;
  totalContacts: number;
  sentCount: number;
  responseCount: number;
  message: string;
  createdAt?: string;
}

interface Template {
  id: number;
  name: string;
  businessType: string;
  description: string;
  usageCount: number;
  previewUrl?: string;
  features?: string;
}

interface Appointment {
  id: number;
  companyId?: number;
  projectId?: number;
  businessId?: number; // legacy compatibility
  datetime: string;
  status: string;
  notes?: string;
  isAutoScheduled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  squarespaceId?: string;
}

interface ProgressEntry {
  id: number;
  companyId?: number;
  projectId?: number;
  businessId?: number; // legacy compatibility
  stage: string;
  imageUrl: string;
  date: string;
  notes?: string;
  publiclyVisible?: number;
  paymentRequired?: number;
  paymentAmount?: number;
  paymentStatus?: string;
  paymentNotes?: string;
  stripeLink?: string;
  createdAt?: string;
  updatedAt?: string;
}

// NEW: Project Message interface for client-admin communication
interface ProjectMessage {
  id: number;
  projectId: number;
  senderType: 'admin' | 'client';
  senderName: string;
  content: string;
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ProjectFile is imported from shared/schema.js - no need to redefine

// In-memory storage
class InMemoryDatabase {
  private companies: Company[] = [];
  private projects: Project[] = [];
  private projectMessages: ProjectMessage[] = []; // NEW: Storage for project messages
  private projectFiles: ProjectFile[] = []; // NEW: Storage for project files
  private businesses: Business[] = [];
  private activities: Activity[] = [];
  private campaigns: Campaign[] = [];
  private templates: Template[] = [];
  private appointments: Appointment[] = [];
  private progressEntries: ProgressEntry[] = [];
  private counters = {
    companies: 0,
    projects: 0,
    projectMessages: 0, // NEW: Counter for messages
    projectFiles: 0, // NEW: Counter for files
    businesses: 0,
    activities: 0,
    campaigns: 0,
    templates: 0,
    appointments: 0,
    progressEntries: 0
  };
  
  private nextId = 1;

  constructor() {
    this.loadFromDisk();
    this.initializeWithSampleData();
  }

  // Save all data to disk
  private saveToDisk(): void {
    try {
      const data = {
        companies: this.companies,
        projects: this.projects,
        projectMessages: this.projectMessages,
        projectFiles: this.projectFiles,
        businesses: this.businesses,
        activities: this.activities,
        campaigns: this.campaigns,
        templates: this.templates,
        appointments: this.appointments,
        progressEntries: this.progressEntries,
        counters: this.counters,
        nextId: this.nextId
      };
      
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
      console.log('💾 Data saved to disk');
    } catch (error) {
      console.error('❌ Error saving data to disk:', error);
    }
  }

  // Load all data from disk
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
        
        this.companies = data.companies || [];
        this.projects = data.projects || [];
        this.projectMessages = data.projectMessages || [];
        this.projectFiles = data.projectFiles || [];
        this.businesses = data.businesses || [];
        this.activities = data.activities || [];
        this.campaigns = data.campaigns || [];
        this.templates = data.templates || [];
        this.appointments = data.appointments || [];
        this.progressEntries = data.progressEntries || [];
        this.counters = data.counters || {
          companies: 0,
          projects: 0,
          projectMessages: 0,
          projectFiles: 0,
          businesses: 0,
          activities: 0,
          campaigns: 0,
          templates: 0,
          appointments: 0,
          progressEntries: 0
        };
        this.nextId = data.nextId || 1;
        
        console.log(`📂 Loaded existing data from disk: ${this.companies.length} companies, ${this.projects.length} projects, ${this.projectMessages.length} messages`);
      } else {
        console.log('📂 No existing data file found, starting fresh');
      }
    } catch (error) {
      console.error('❌ Error loading data from disk:', error);
      console.log('📂 Starting with fresh data');
    }
  }

  // Simulate INSERT with RETURNING
  insert<T extends { id?: number }>(table: string, data: T): T[] {
    const newRecord: any = { 
      ...data, 
      id: data.id || this.nextId++, 
      createdAt: (data as any).createdAt || new Date().toISOString() 
    };
    
    switch (table) {
      case 'companies':
        this.companies.push(newRecord);
        break;
      case 'projects':
        // Generate access token if not provided
        if (!newRecord.accessToken) {
          newRecord.accessToken = this.generateAccessToken();
        }
        this.projects.push(newRecord);
        break;
      case 'project_messages':
        this.projectMessages.push(newRecord);
        this.saveToDisk();
        break;
      case 'project_files':
        this.projectFiles.push(newRecord);
        this.saveToDisk();
        break;
      case 'businesses':
        this.businesses.push(newRecord);
        break;
      case 'activities':
        this.activities.push(newRecord);
        break;
      case 'campaigns':
        this.campaigns.push(newRecord);
        break;
      case 'templates':
        this.templates.push(newRecord);
        break;
      case 'appointments':
        this.appointments.push(newRecord);
        break;
      case 'progress_entries':
        this.progressEntries.push(newRecord);
        break;
    }
    
    // Save to disk after every insert
    this.saveToDisk();
    
    return [newRecord];
  }

  // Simulate SELECT
  select(table: string, where?: any): any[] {
    let data: any[] = [];
    
    switch (table) {
      case 'companies':
        data = [...this.companies];
        break;
      case 'projects':
        data = [...this.projects];
        break;
      case 'project_messages':
        data = [...this.projectMessages];
        break;
      case 'project_files':
        data = [...this.projectFiles];
        break;
      case 'businesses':
        data = [...this.businesses];
        break;
      case 'activities':
        data = [...this.activities];
        break;
      case 'campaigns':
        data = [...this.campaigns];
        break;
      case 'templates':
        data = [...this.templates];
        break;
      case 'appointments':
        data = [...this.appointments];
        break;
      case 'progress_entries':
        data = [...this.progressEntries];
        break;
    }

    // Apply simple WHERE filtering
    if (where && where.id !== undefined) {
      data = data.filter(item => item.id === where.id);
    }
    if (where && where.companyId !== undefined) {
      data = data.filter(item => item.companyId === where.companyId);
    }
    if (where && where.projectId !== undefined) {
      data = data.filter(item => item.projectId === where.projectId);
    }
    if (where && where.businessId !== undefined) {
      data = data.filter(item => item.businessId === where.businessId);
    }
    if (where && where.accessToken !== undefined) {
      data = data.filter(item => item.accessToken === where.accessToken);
    }
    // Add tag filtering
    if (where && where.tag !== undefined) {
      data = data.filter(item => item.tags && item.tags.includes(where.tag));
    }

    return data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  // Simulate UPDATE
  update<T>(table: string, data: Partial<T>, where: any): T[] {
    let collection: any[] = [];
    
    switch (table) {
      case 'companies':
        collection = this.companies;
        break;
      case 'projects':
        collection = this.projects;
        break;
      case 'project_messages':
        collection = this.projectMessages;
        break;
      case 'project_files':
        collection = this.projectFiles;
        break;
      case 'businesses':
        collection = this.businesses;
        break;
      case 'activities':
        collection = this.activities;
        break;
      case 'campaigns':
        collection = this.campaigns;
        break;
      case 'templates':
        collection = this.templates;
        break;
      case 'appointments':
        collection = this.appointments;
        break;
      case 'progress_entries':
        collection = this.progressEntries;
        break;
    }

    const index = collection.findIndex(item => item.id === where.id);
    if (index !== -1) {
      collection[index] = { ...collection[index], ...data, updatedAt: new Date().toISOString() };
      
      // Save to disk after every update
      this.saveToDisk();
      
      return [collection[index]];
    }
    return [];
  }

  // Simulate DELETE
  delete(table: string, where: any): void {
    switch (table) {
      case 'companies':
        this.companies = this.companies.filter(item => item.id !== where.id);
        break;
      case 'projects':
        this.projects = this.projects.filter(item => item.id !== where.id);
        break;
      case 'project_messages':
        this.projectMessages = this.projectMessages.filter(item => item.id !== where.id);
        break;
      case 'project_files':
        this.projectFiles = this.projectFiles.filter(item => item.id !== where.id);
        break;
      case 'businesses':
        this.businesses = this.businesses.filter(item => item.id !== where.id);
        break;
      case 'activities':
        this.activities = this.activities.filter(item => item.id !== where.id);
        break;
      case 'campaigns':
        this.campaigns = this.campaigns.filter(item => item.id !== where.id);
        break;
      case 'templates':
        this.templates = this.templates.filter(item => item.id !== where.id);
        break;
      case 'appointments':
        this.appointments = this.appointments.filter(item => item.id !== where.id);
        break;
      case 'progress_entries':
        this.progressEntries = this.progressEntries.filter(item => item.id !== where.id);
        break;
    }
    
    // Save to disk after every delete
    this.saveToDisk();
  }

  // NEW: Generate UUID-like token for client access
  private generateAccessToken(): string {
    return Math.random().toString(36).substring(2) + 
           Math.random().toString(36).substring(2) + 
           Math.random().toString(36).substring(2);
  }

  // Generate stable token based on email for consistent customer experience
  private generateStableToken(email: string): string {
    // For Ben's email, always use the same token for testing
    if (email === 'ben04537@gmail.com') {
      return 'Q_lXDL9XQ-Q8d-jay7W2a2ZU'; // Fixed token for testing
    }
    
    // For other emails, generate a consistent token based on email hash
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert hash to a token-like string
    const hashStr = Math.abs(hash).toString(36);
    return `stable_${hashStr}_${email.split('@')[0].slice(0, 5)}`;
  }

  // 🔒 SECURITY: Always create new secure conversations for privacy
  async findOrCreateCustomerProject(email: string, name: string, source?: string): Promise<{ projectId: number, token: string }> {
    try {
      // Import secure token generation
      const { generateSecureProjectToken, generateConversationMetadata } = await import('./utils/tokenGenerator.js');
      
      // Check if client already exists
      const existingClient = await this.findClientByEmail(email);
      
      if (existingClient) {
        console.log(`✅ Found existing client by email: ${existingClient.name} (ID: ${existingClient.id})`);
        
        // 🔒 PRIVACY FIX: ALWAYS create new conversations for security
        // Each form submission gets its own private conversation thread
        const secureToken = generateSecureProjectToken(source || 'squarespace_form', email);
        const conversationMetadata = generateConversationMetadata(source || 'squarespace_form', email);
        
        // Create new project with secure token
        const companyId = existingClient.id;
        if (typeof companyId !== 'number') {
            throw new Error('Client ID is missing or invalid.');
        }

        const projectId = await this.createProject({
          title: `${existingClient.name} - Conversation ${secureToken.submissionId}`,
          companyId: companyId,
          accessToken: secureToken.token, // Use cryptographically secure token
          status: 'active',
          description: `Secure conversation created from ${source || 'form submission'}`
        });
        
        const project = this.projects.find(p => p.id === projectId);
        console.log(`🆕 [SECURE_CONVERSATION] Created private conversation for existing client: ${secureToken.token}`);
        
        return { projectId, token: secureToken.token };
      }
      
      // Create new client and project with secure token
      const newCompanyId = await this.createCompany({
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

      if (typeof newCompanyId !== 'number') {
        throw new Error('Failed to create a new company.');
      }
      
      // Create project with secure token
      const secureToken = generateSecureProjectToken(source || 'squarespace_form', email);
      const projectId = await this.createProject({
        title: `${name} - Conversation ${secureToken.submissionId}`,
        companyId: newCompanyId,
        accessToken: secureToken.token, // Always use secure tokens
        status: 'active',
        description: `Secure conversation created from ${source || 'form submission'}`
      });
      
      const project = this.projects.find(p => p.id === projectId);
      console.log(`✅ Created new project: ID ${projectId}, Token: ${secureToken.token}`);
      
      return { projectId, token: secureToken.token };
      
    } catch (error) {
      console.error('Error in findOrCreateCustomerProject:', error);
      throw error;
    }
  }

  // Find client by email
  async findClientByEmail(email: string): Promise<any | null> {
    return this.companies.find(c => c.email === email) || null;
  }

  // Get projects by company ID
  async getProjectsByCompanyId(companyId: number): Promise<any[]> {
    return this.projects.filter(p => p.companyId === companyId);
  }

  // Get projects by company (alias for compatibility)
  async getProjectsByCompany(companyId: number): Promise<any[]> {
    return this.getProjectsByCompanyId(companyId);
  }

  // Get project by access token
  async getProjectByAccessToken(token: string): Promise<any | null> {
    return this.projects.find(p => p.accessToken === token) || null;
  }

  // Get project by token (alias for compatibility)
  async getProjectByToken(token: string): Promise<any | null> {
    return this.getProjectByAccessToken(token);
  }

  // Create new company
  async createCompany(data: any): Promise<number> {
    const newId = Math.max(...this.companies.map(c => c.id), 0) + 1;
    const company = {
      id: newId,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      industry: data.industry || '',
      website: data.website || '',
      priority: 'medium',
      tags: [],
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.companies.push(company);
    
    // Save to disk after creating company
    this.saveToDisk();
    
    return newId;
  }

  // Create new project
  async createProject(data: any): Promise<number> {
    const newId = Math.max(...this.projects.map(p => p.id), 0) + 1;
    const project = {
      id: newId,
      companyId: data.companyId,
      title: data.title,
      type: 'website',
      stage: 'planning',
      status: data.status || 'active',
      score: 0,
      notes: data.description || '',
      totalAmount: 0,
      paidAmount: 0,
      paymentStatus: 'pending',
      accessToken: data.accessToken || data.token,
      token: data.accessToken || data.token, // Add both for compatibility
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.projects.push(project);
    
    // Save to disk after creating project
    this.saveToDisk();
    
    return newId;
  }

  private initializeWithSampleData() {
    // Only initialize if we have no existing data
    if (this.companies.length === 0 && this.projects.length === 0) {
      console.log("✅ No existing data found - creating test project");
      this.ensureTestProject();
    } else {
      console.log(`✅ Loaded existing data: ${this.companies.length} companies, ${this.projects.length} projects, ${this.projectMessages.length} messages`);
    }
  }

  // Ensure test project exists with stable token for Ben's email
  private async ensureTestProject(): Promise<void> {
    try {
      // Check if Ben's project already exists
      const existingClient = await this.findClientByEmail('ben04537@gmail.com');
      
      if (!existingClient) {
        console.log('🔧 Creating stable test project for ben04537@gmail.com...');
        
        // Create Ben's company
        const companyId = await this.createCompany({
          name: 'Ben Dickinson',
          email: 'ben04537@gmail.com',
          phone: '',
          address: '',
          city: '',
          state: '',
          website: '',
          industry: 'Testing',
          tags: [],
          priority: 'high'
        });
        
        if (!companyId) {
          throw new Error('Failed to create company');
        }
        
        // Create project with stable token
        const projectId = await this.createProject({
          title: 'Ben Dickinson - Website Project',
          companyId: companyId,
          token: 'Q_lXDL9XQ-Q8d-jay7W2a2ZU', // Fixed stable token
          status: 'active',
          description: 'Test project for Squarespace integration',
          totalValue: 5000,
          paidAmount: 0,
          nextPayment: 2500,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        console.log(`✅ Created stable test project: ID ${projectId}, Token: Q_lXDL9XQ-Q8d-jay7W2a2ZU`);
      } else {
        console.log('✅ Test project already exists for ben04537@gmail.com');
      }
    } catch (error) {
      console.error('❌ Error ensuring test project:', error);
    }
  }

  // Message and file operations using in-memory data
  async getProjectMessages(projectId: number): Promise<Message[]> {
    return this.projectMessages.filter(m => m.projectId === projectId).map(pm => ({
      ...pm,
      createdAt: pm.createdAt || new Date().toISOString()
    })) as Message[];
  }

  async getProjectsWithMessages(): Promise<Project[]> {
    const projectIdsWithMessages = new Set(this.projectMessages.map(m => m.projectId));
    return this.projects.filter(p => projectIdsWithMessages.has(p.id!));
  }

  async createProjectMessage(message: Omit<Message, 'id' | 'createdAt' | 'attachments'> & { attachments?: string[] }): Promise<Message> {
    const newMessage = {
      ...message,
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      attachments: message.attachments || []
    } as Message;
    
    this.projectMessages.push(newMessage as any);
    this.saveToDisk();
    return newMessage;
  }

  async getAllMessages(): Promise<Message[]> {
    return this.projectMessages.map(pm => ({
      ...pm,
      createdAt: pm.createdAt || new Date().toISOString()
    })) as Message[];
  }

  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return this.projectFiles.filter(f => f.projectId === projectId);
  }
}

// Create singleton instance
const memoryDb = new InMemoryDatabase();

// Export mock db object that matches drizzle interface
export const db = {
  insert: (schema: any) => ({
    values: (data: any) => ({
      returning: () => memoryDb.insert(schema.tableName || 'businesses', data)
    })
  }),
  select: () => ({
    from: (schema: any) => ({
      where: (condition: any) => memoryDb.select(schema.tableName || 'businesses', condition),
      orderBy: (order: any) => memoryDb.select(schema.tableName || 'businesses')
    })
  }),
  update: (schema: any) => ({
    set: (data: any) => ({
      where: (condition: any) => ({
        returning: () => memoryDb.update(schema.tableName || 'businesses', data, condition)
      })
    })
  }),
  delete: (schema: any) => ({
    where: (condition: any) => memoryDb.delete(schema.tableName || 'businesses', condition)
  })
};

// For compatibility with existing code
export const pool = { query: () => { throw new Error('Use db instead of pool'); } }; 