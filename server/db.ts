// In-memory database implementation for quick development
// This avoids SQLite compilation issues and gets us running fast

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
  tags?: string;
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
  businessId?: number;
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
  businessId: number;
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
  businessId: number;
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

// In-memory storage
class InMemoryDatabase {
  private businesses: Business[] = [];
  private activities: Activity[] = [];
  private campaigns: Campaign[] = [];
  private templates: Template[] = [];
  private appointments: Appointment[] = [];
  private progressEntries: ProgressEntry[] = [];
  
  private nextId = 1;

  constructor() {
    this.initializeWithSampleData();
  }

  // Simulate INSERT with RETURNING
  insert<T extends { id?: number }>(table: string, data: T): T[] {
    const newRecord = { ...data, id: this.nextId++, createdAt: new Date().toISOString() } as T;
    
    switch (table) {
      case 'businesses':
        this.businesses.push(newRecord as any);
        break;
      case 'activities':
        this.activities.push(newRecord as any);
        break;
      case 'campaigns':
        this.campaigns.push(newRecord as any);
        break;
      case 'templates':
        this.templates.push(newRecord as any);
        break;
      case 'appointments':
        this.appointments.push(newRecord as any);
        break;
      case 'progress_entries':
        this.progressEntries.push(newRecord as any);
        break;
    }
    
    return [newRecord];
  }

  // Simulate SELECT
  select(table: string, where?: any): any[] {
    let data: any[] = [];
    
    switch (table) {
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
    if (where && where.businessId !== undefined) {
      data = data.filter(item => item.businessId === where.businessId);
    }

    return data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  // Simulate UPDATE
  update<T>(table: string, data: Partial<T>, where: any): T[] {
    let collection: any[] = [];
    
    switch (table) {
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

  private initializeWithSampleData() {
    // Add some sample businesses
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
        totalAmount: 1200,
        paidAmount: 600,
        createdAt: new Date().toISOString()
      }
    ];

    this.nextId = 7;

    // Add sample appointments
    this.appointments = [
      {
        id: 1,
        businessId: 1, // Coastal Electric
        datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T08:30:00.000Z', // 2 days from now at 8:30 AM
        status: 'scheduled',
        notes: 'Initial consultation for website design',
        isAutoScheduled: true,
        squarespaceId: 'acuity_123456',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        businessId: 4, // Summit Roofing
        datetime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T09:00:00.000Z', // 5 days from now at 9:00 AM
        status: 'scheduled',
        notes: 'Follow-up meeting to review website progress',
        isAutoScheduled: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        businessId: 2, // Hampton Plumbing
        datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T08:30:00.000Z', // 7 days from now at 8:30 AM
        status: 'scheduled',
        notes: 'Project delivery and final review',
        isAutoScheduled: true,
        squarespaceId: 'acuity_789012',
        createdAt: new Date().toISOString()
      }
    ];

    this.nextId = 8;
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