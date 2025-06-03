import { db } from "./db.js";
import type { Business, NewBusiness, Activity, NewActivity } from "../shared/schema.js";

// Mock schema objects for the in-memory database
const businessesTable = { tableName: 'businesses' };
const activitiesTable = { tableName: 'activities' };
const campaignsTable = { tableName: 'campaigns' };
const templatesTable = { tableName: 'templates' };
const appointmentsTable = { tableName: 'appointments' };
const progressEntriesTable = { tableName: 'progress_entries' };

export class Storage {
  // Business operations
  async createBusiness(data: any): Promise<Business> {
    const results: any[] = db.insert(businessesTable).values(data).returning();
    return results[0] as Business;
  }

  async getBusinesses(): Promise<Business[]> {
    const results: any[] = db.select().from(businessesTable).orderBy({});
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

  // Activity operations
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

  // Appointment operations
  async getAppointments() {
    const results: any[] = db.select().from(appointmentsTable).orderBy({});
    return results;
  }

  async createAppointment(data: any) {
    const results: any[] = db.insert(appointmentsTable).values(data).returning();
    return results[0];
  }

  async getAppointmentsByBusinessId(businessId: number) {
    const results: any[] = db.select().from(appointmentsTable).where({ businessId });
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
}

// Export singleton instance
export const storage = new Storage(); 