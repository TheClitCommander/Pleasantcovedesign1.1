// In-memory database implementation for quick development
// This avoids SQLite compilation issues and gets us running fast

interface Company {
  id: number;
  name: string;
  email?: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  industry: string;
  website?: string;
  priority?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface Project {
  id: number;
  companyId: number;
  title: string;
  type: string;
  stage: string;
  status: string;
  score?: number;
  notes?: string;
  totalAmount?: number;
  paidAmount?: number;
  scheduledTime?: string;
  appointmentStatus?: string;
  paymentStatus?: string;
  stripeCustomerId?: string;
  stripePaymentLinkId?: string;
  lastPaymentDate?: string;
  paymentNotes?: string;
  accessToken?: string;
  createdAt?: string;
  updatedAt?: string;
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

interface Activity {
  id: number;
  type: string;
  description: string;
  companyId?: number;
  projectId?: number;
  businessId?: number; // legacy compatibility
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

// NEW: Project File interface for file management
interface ProjectFile {
  id: number;
  projectId: number;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
  uploadedBy: 'admin' | 'client';
  uploaderName: string;
  description?: string;
  createdAt?: string;
}

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
    this.initializeWithSampleData();
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
        break;
      case 'project_files':
        this.projectFiles.push(newRecord);
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
  }

  // NEW: Generate UUID-like token for client access
  private generateAccessToken(): string {
    return Math.random().toString(36).substring(2) + 
           Math.random().toString(36).substring(2) + 
           Math.random().toString(36).substring(2);
  }

  private initializeWithSampleData() {
    // Add sample companies (converted from original businesses)
    this.companies = [
      {
        id: 1,
        name: "Coastal Electric",
        email: "info@coastalelectric.com",
        phone: "(555) 123-4567",
        address: "123 Ocean Ave",
        city: "Virginia Beach",
        state: "VA",
        industry: "electrical",
        website: "https://coastalelectric.com",
        priority: "high",
        tags: ["electrical", "residential", "high-value", "local"],
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: "Hampton Plumbing",
        email: "contact@hamptonplumbing.net",
        phone: "(555) 234-5678",
        address: "456 Business Blvd",
        city: "Hampton",
        state: "VA",
        industry: "plumbing",
        website: "https://hamptonplumbing.net",
        priority: "high",
        tags: ["plumbing", "family-business", "experienced", "trusted"],
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        name: "Norfolk HVAC Solutions",
        email: "",
        phone: "(555) 345-6789",
        address: "789 Industrial Way",
        city: "Norfolk",
        state: "VA",
        industry: "hvac",
        website: "",
        priority: "medium",
        tags: ["hvac", "commercial", "residential"],
        createdAt: new Date().toISOString()
      },
      {
        id: 4,
        name: "Summit Roofing",
        email: "hello@summitroofing.co",
        phone: "(555) 456-7890",
        address: "321 Commerce Dr",
        city: "Chesapeake",
        state: "VA",
        industry: "roofing",
        website: "https://summitroofing.co",
        priority: "high",
        tags: ["roofing", "storm-damage", "insurance", "urgent"],
        createdAt: new Date().toISOString()
      },
      {
        id: 5,
        name: "Tidewater Construction",
        email: "admin@tidewaterconstruction.net",
        phone: "(555) 567-8901",
        address: "654 Main St",
        city: "Portsmouth",
        state: "VA",
        industry: "construction",
        website: "https://tidewaterconstruction.net",
        priority: "medium",
        tags: ["construction", "full-service", "commercial"],
        createdAt: new Date().toISOString()
      },
      {
        id: 6,
        name: "Elite Landscaping",
        email: "",
        phone: "(555) 678-9012",
        address: "987 Oak Ave",
        city: "Suffolk",
        state: "VA",
        industry: "landscaping",
        website: "",
        priority: "high",
        tags: ["landscaping", "design", "maintenance", "seasonal"],
        createdAt: new Date().toISOString()
      }
    ];

    // Add sample projects (created from original business data)
    this.projects = [
      {
        id: 1,
        companyId: 1, // Coastal Electric
        title: "Business Website Redesign",
        type: "website",
        stage: "scraped",
        status: "active",
        score: 75,
        notes: "Need modern website to showcase residential electrical work",
        accessToken: this.generateAccessToken(),
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        companyId: 2, // Hampton Plumbing
        title: "SEO Optimization Package",
        type: "seo",
        stage: "contacted",
        status: "active",
        score: 85,
        notes: "Want to rank higher for 'Hampton plumbing services'",
        accessToken: this.generateAccessToken(),
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        companyId: 3, // Norfolk HVAC Solutions
        title: "New Website Development",
        type: "website",
        stage: "responded",
        status: "active",
        score: 60,
        notes: "Commercial and residential HVAC services website",
        accessToken: this.generateAccessToken(),
        createdAt: new Date().toISOString()
      },
      {
        id: 4,
        companyId: 4, // Summit Roofing
        title: "Emergency Storm Damage Landing Page",
        type: "website",
        stage: "scheduled",
        status: "active",
        score: 90,
        notes: "Urgent need for storm damage specialist landing page",
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        accessToken: this.generateAccessToken(),
        createdAt: new Date().toISOString()
      },
      {
        id: 5,
        companyId: 5, // Tidewater Construction
        title: "Full Website & Branding Package",
        type: "branding",
        stage: "quoted",
        status: "active",
        score: 70,
        notes: "Complete rebrand with new website for construction company",
        totalAmount: 2500,
        paidAmount: 0,
        accessToken: this.generateAccessToken(),
        createdAt: new Date().toISOString()
      },
      {
        id: 6,
        companyId: 6, // Elite Landscaping
        title: "Portfolio Website",
        type: "website",
        stage: "sold",
        status: "active",
        score: 80,
        notes: "Showcase residential and commercial landscaping work",
        totalAmount: 1200,
        paidAmount: 600,
        accessToken: this.generateAccessToken(),
        createdAt: new Date().toISOString()
      },
      {
        id: 7,
        companyId: 2, // Hampton Plumbing - second project
        title: "Google Ads Campaign Setup",
        type: "consultation",
        stage: "scraped",
        status: "active",
        score: 70,
        notes: "Set up and manage Google Ads for emergency plumbing calls",
        accessToken: this.generateAccessToken(),
        createdAt: new Date().toISOString()
      }
    ];

    this.nextId = 8;

    // Add sample appointments (updated to reference projects)
    this.appointments = [
      {
        id: 1,
        companyId: 1,
        projectId: 1, // Coastal Electric website project
        datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T08:30:00.000Z',
        status: 'scheduled',
        notes: 'Initial consultation for website redesign',
        isAutoScheduled: true,
        squarespaceId: 'acuity_123456',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        companyId: 4,
        projectId: 4, // Summit Roofing landing page
        datetime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T09:00:00.000Z',
        status: 'scheduled',
        notes: 'Urgent consultation for storm damage landing page',
        isAutoScheduled: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        companyId: 2,
        projectId: 2, // Hampton Plumbing SEO project
        datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T08:30:00.000Z',
        status: 'scheduled',
        notes: 'SEO strategy review and keyword planning',
        isAutoScheduled: true,
        squarespaceId: 'acuity_789012',
        createdAt: new Date().toISOString()
      }
    ];

    // Legacy businesses data (for backward compatibility)
    this.businesses = [
      {
        id: 1,
        name: "Coastal Electric",
        email: "info@coastalelectric.com",
        phone: "(555) 123-4567",
        address: "123 Ocean Ave",
        city: "Virginia Beach",
        state: "VA",
        businessType: "electrical",
        stage: "scraped",
        website: "https://coastalelectric.com",
        notes: "Specializes in residential electrical work",
        score: 75,
        priority: "high",
        tags: ["electrical", "residential", "high-value", "local"],
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: "Hampton Plumbing",
        email: "contact@hamptonplumbing.net",
        phone: "(555) 234-5678",
        address: "456 Business Blvd",
        city: "Hampton",
        state: "VA",
        businessType: "plumbing",
        stage: "contacted",
        website: "https://hamptonplumbing.net",
        notes: "Family-owned business since 1995",
        score: 85,
        priority: "high",
        tags: ["plumbing", "family-business", "experienced", "trusted"],
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        name: "Norfolk HVAC Solutions",
        email: "",
        phone: "(555) 345-6789",
        address: "789 Industrial Way",
        city: "Norfolk",
        state: "VA",
        businessType: "hvac",
        stage: "responded",
        website: "",
        notes: "Commercial and residential HVAC services",
        score: 60,
        priority: "medium",
        tags: ["hvac", "commercial", "residential"],
        createdAt: new Date().toISOString()
      },
      {
        id: 4,
        name: "Summit Roofing",
        email: "hello@summitroofing.co",
        phone: "(555) 456-7890",
        address: "321 Commerce Dr",
        city: "Chesapeake",
        state: "VA",
        businessType: "roofing",
        stage: "scheduled",
        website: "https://summitroofing.co",
        notes: "Storm damage specialists",
        score: 90,
        priority: "high",
        tags: ["roofing", "storm-damage", "insurance", "urgent"],
        scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 5,
        name: "Tidewater Construction",
        email: "admin@tidewaterconstruction.net",
        phone: "(555) 567-8901",
        address: "654 Main St",
        city: "Portsmouth",
        state: "VA",
        businessType: "construction",
        stage: "quoted",
        website: "https://tidewaterconstruction.net",
        notes: "Full-service construction company",
        score: 70,
        priority: "medium",
        tags: ["construction", "full-service", "commercial"],
        totalAmount: 2500,
        paidAmount: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 6,
        name: "Elite Landscaping",
        email: "",
        phone: "(555) 678-9012",
        address: "987 Oak Ave",
        city: "Suffolk",
        state: "VA",
        businessType: "landscaping",
        stage: "sold",
        website: "",
        notes: "Residential and commercial landscaping",
        score: 80,
        priority: "high",
        tags: ["landscaping", "design", "maintenance", "seasonal"],
        totalAmount: 1200,
        paidAmount: 600,
        createdAt: new Date().toISOString()
      }
    ];

    this.nextId = 10;

    // Add sample project messages for demonstration
    this.projectMessages = [
      {
        id: 1,
        projectId: 1, // Coastal Electric website project
        senderType: 'admin',
        senderName: 'Ben Dickinson',
        content: 'Hi! Welcome to your project portal. I\'ve started working on your website redesign and will keep you updated with progress here.',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        projectId: 1,
        senderType: 'admin',
        senderName: 'Ben Dickinson',
        content: 'I\'ve created some initial wireframes for your homepage. Take a look and let me know your thoughts!',
        attachments: ['/uploads/coastal-electric-wireframes.pdf'],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        projectId: 2, // Hampton Plumbing SEO project
        senderType: 'admin',
        senderName: 'Ben Dickinson',
        content: 'I\'ve completed the initial keyword research for your SEO campaign. Found some great opportunities!',
        attachments: ['/uploads/hampton-plumbing-keywords.xlsx'],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        projectId: 6, // Elite Landscaping portfolio
        senderType: 'client',
        senderName: 'Elite Landscaping Team',
        content: 'Thanks for the great progress! We love the design direction. Can you add a section for our commercial projects?',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Add sample project files for demonstration
    this.projectFiles = [
      {
        id: 1,
        projectId: 1, // Coastal Electric
        fileName: 'coastal-electric-wireframes.pdf',
        fileUrl: '/uploads/coastal-electric-wireframes.pdf',
        fileSize: 2048000, // 2MB
        fileType: 'application/pdf',
        uploadedBy: 'admin',
        uploaderName: 'Ben Dickinson',
        description: 'Initial homepage wireframes and layout concepts',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        projectId: 1,
        fileName: 'coastal-electric-logo.png',
        fileUrl: '/uploads/coastal-electric-logo.png',
        fileSize: 512000, // 512KB
        fileType: 'image/png',
        uploadedBy: 'client',
        uploaderName: 'Coastal Electric Team',
        description: 'Company logo and brand assets',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        projectId: 2, // Hampton Plumbing
        fileName: 'hampton-plumbing-keywords.xlsx',
        fileUrl: '/uploads/hampton-plumbing-keywords.xlsx',
        fileSize: 128000, // 128KB
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadedBy: 'admin',
        uploaderName: 'Ben Dickinson',
        description: 'Keyword research and SEO strategy document',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        projectId: 6, // Elite Landscaping
        fileName: 'project-photos.zip',
        fileUrl: '/uploads/project-photos.zip',
        fileSize: 15728640, // 15MB
        fileType: 'application/zip',
        uploadedBy: 'client',
        uploaderName: 'Elite Landscaping Team',
        description: 'High-resolution photos of completed landscaping projects',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    ];
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

console.log("✅ In-memory database initialized with sample data");

// For compatibility with existing code
export const pool = { query: () => { throw new Error('Use db instead of pool'); } }; 