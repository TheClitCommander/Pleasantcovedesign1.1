// @ts-nocheck
import { Pool } from 'pg';
import type { Business, NewBusiness, Activity, NewActivity, Company, NewCompany, Project, NewProject, ProjectMessage, ProjectFile } from "../shared/schema.js";

export class PostgreSQLStorage {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    console.log('🐘 PostgreSQL storage initialized');
    this.initializeTables();
  }

  private async initializeTables() {
    try {
      // Read and execute schema
      const fs = await import('fs');
      const path = await import('path');
      const schemaPath = path.join(process.cwd(), 'server', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      await this.pool.query(schema);
      console.log('✅ PostgreSQL tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize PostgreSQL tables:', error);
    }
  }

  // Company operations
  async createCompany(data: NewCompany): Promise<Company> {
    const query = `
      INSERT INTO companies (name, email, phone, address, city, state, industry, website, priority, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      data.name, data.email, data.phone, data.address, data.city, 
      data.state, data.industry, data.website, data.priority || 'medium', 
      data.tags || []
    ];
    
    const result = await this.pool.query(query, values);
    return this.mapCompany(result.rows[0]);
  }

  async getCompanies(): Promise<Company[]> {
    const result = await this.pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    return result.rows.map(row => this.mapCompany(row));
  }

  async getCompanyById(id: number): Promise<Company | null> {
    const result = await this.pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    return result.rows[0] ? this.mapCompany(result.rows[0]) : null;
  }

  async updateCompany(id: number, data: Partial<Company>): Promise<Company | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    const query = `
      UPDATE companies 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    return result.rows[0] ? this.mapCompany(result.rows[0]) : null;
  }

  // Project operations
  async createProject(data: NewProject): Promise<Project> {
    const query = `
      INSERT INTO projects (company_id, title, type, stage, status, score, notes, total_amount, paid_amount, access_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      data.companyId, data.title, data.type, data.stage, data.status || 'active',
      data.score || 0, data.notes, data.totalAmount || 0, data.paidAmount || 0, data.accessToken
    ];
    
    const result = await this.pool.query(query, values);
    return this.mapProject(result.rows[0]);
  }

  async getProjects(filters?: any): Promise<Project[]> {
    let query = 'SELECT * FROM projects';
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (filters) {
      if (filters.status) {
        conditions.push(`status = $${paramCount}`);
        values.push(filters.status);
        paramCount++;
      }
      if (filters.companyId) {
        conditions.push(`company_id = $${paramCount}`);
        values.push(filters.companyId);
        paramCount++;
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapProject(row));
  }

  async getProjectById(id: number): Promise<Project | null> {
    const result = await this.pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return result.rows[0] ? this.mapProject(result.rows[0]) : null;
  }

  async getProjectByToken(token: string): Promise<Project | null> {
    const result = await this.pool.query('SELECT * FROM projects WHERE access_token = $1', [token]);
    return result.rows[0] ? this.mapProject(result.rows[0]) : null;
  }

  async getProjectsByCompany(companyId: number): Promise<Project[]> {
    const result = await this.pool.query('SELECT * FROM projects WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    return result.rows.map(row => this.mapProject(row));
  }

  async updateProject(id: number, data: Partial<Project>): Promise<Project | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    const query = `
      UPDATE projects 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    return result.rows[0] ? this.mapProject(result.rows[0]) : null;
  }

  // Project Messages
  async getProjectMessages(projectId: number): Promise<ProjectMessage[]> {
    const result = await this.pool.query(
      'SELECT * FROM project_messages WHERE project_id = $1 ORDER BY created_at ASC', 
      [projectId]
    );
    return result.rows.map(row => this.mapProjectMessage(row));
  }

  async createProjectMessage(data: Omit<ProjectMessage, 'id'>): Promise<ProjectMessage> {
    const query = `
      INSERT INTO project_messages (project_id, sender_type, sender_name, content, attachments)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [data.projectId, data.senderType, data.senderName, data.content, data.attachments || []];
    
    const result = await this.pool.query(query, values);
    return this.mapProjectMessage(result.rows[0]);
  }

  // Activities
  async createActivity(data: NewActivity): Promise<Activity> {
    const query = `
      INSERT INTO activities (type, description, company_id, project_id, business_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [data.type, data.description, data.companyId, data.projectId, data.businessId];
    
    const result = await this.pool.query(query, values);
    return this.mapActivity(result.rows[0]);
  }

  // Legacy Business operations (for compatibility)
  async createBusiness(data: any): Promise<Business> {
    const query = `
      INSERT INTO businesses (name, email, phone, address, city, state, business_type, stage, notes, priority, score, website)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const values = [
      data.name, data.email, data.phone, data.address, data.city, data.state,
      data.businessType, data.stage, data.notes, data.priority || 'medium', 
      data.score || 0, data.website
    ];
    
    const result = await this.pool.query(query, values);
    return this.mapBusiness(result.rows[0]);
  }

  async getBusinesses(): Promise<Business[]> {
    const result = await this.pool.query('SELECT * FROM businesses ORDER BY created_at DESC');
    return result.rows.map(row => this.mapBusiness(row));
  }

  async searchBusinesses(query: string): Promise<Business[]> {
    const searchQuery = `
      SELECT * FROM businesses 
      WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(searchQuery, [`%${query}%`]);
    return result.rows.map(row => this.mapBusiness(row));
  }

  // Appointments
  async createAppointment(data: any): Promise<any> {
    const query = `
      INSERT INTO appointments (company_id, project_id, business_id, datetime, status, notes, is_auto_scheduled, service_type, duration, squarespace_id, project_token)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      data.companyId, data.projectId, data.businessId, data.datetime, data.status || 'scheduled',
      data.notes, data.isAutoScheduled || false, data.serviceType || 'consultation', 
      data.duration || 30, data.squarespaceId, data.projectToken
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getAppointments(): Promise<any[]> {
    const result = await this.pool.query('SELECT * FROM appointments ORDER BY datetime DESC');
    return result.rows;
  }

  // Helper methods for mapping database rows to objects
  private mapCompany(row: any): Company {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      industry: row.industry,
      website: row.website,
      priority: row.priority,
      tags: row.tags || [],
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  }

  private mapProject(row: any): Project {
    return {
      id: row.id,
      companyId: row.company_id,
      title: row.title,
      type: row.type,
      stage: row.stage,
      status: row.status,
      score: row.score,
      notes: row.notes,
      totalAmount: parseFloat(row.total_amount) || 0,
      paidAmount: parseFloat(row.paid_amount) || 0,
      accessToken: row.access_token,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  }

  private mapProjectMessage(row: any): ProjectMessage {
    return {
      id: row.id,
      projectId: row.project_id,
      senderType: row.sender_type,
      senderName: row.sender_name,
      content: row.content,
      attachments: row.attachments || [],
      createdAt: row.created_at?.toISOString()
    };
  }

  private mapActivity(row: any): Activity {
    return {
      id: row.id,
      type: row.type,
      description: row.description,
      companyId: row.company_id,
      projectId: row.project_id,
      businessId: row.business_id,
      createdAt: row.created_at?.toISOString()
    };
  }

  private mapBusiness(row: any): Business {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      businessType: row.business_type,
      stage: row.stage,
      notes: row.notes,
      priority: row.priority,
      score: row.score,
      website: row.website,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Additional methods needed for compatibility
  async getProjectSummaryByToken(token: string): Promise<any> {
    const project = await this.getProjectByToken(token);
    if (!project) return null;

    const company = await this.getCompanyById(project.companyId);
    const messages = await this.getProjectMessages(project.id!);
    
    return {
      project,
      company,
      messages,
      files: [], // TODO: Implement file retrieval
      activities: [] // TODO: Implement activity retrieval for project
    };
  }

  // Placeholder methods for missing functionality
  async getCampaigns() { return []; }
  async createCampaign(data: any) { return data; }
  async getTemplates() { return []; }
  async createTemplate(data: any) { return data; }
  async getProgressEntries() { return []; }
  async createProgressEntry(data: any) { return data; }
  async getAppointmentsByProject(projectId: number) { 
    const result = await this.pool.query('SELECT * FROM appointments WHERE project_id = $1', [projectId]);
    return result.rows;
  }
  async getAppointmentById(id: number) {
    const result = await this.pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
  async updateAppointment(id: number, data: any) {
    // TODO: Implement
    return null;
  }
  async deleteProject(id: number) {
    await this.pool.query('DELETE FROM projects WHERE id = $1', [id]);
  }
  async deleteBusiness(id: number) {
    await this.pool.query('DELETE FROM businesses WHERE id = $1', [id]);
  }
  async createProjectFile(data: any) {
    // TODO: Implement
    return data;
  }
  async updateProjectMessage(id: number, data: any) {
    // TODO: Implement
    return null;
  }
  async deleteProjectMessage(id: number) {
    await this.pool.query('DELETE FROM project_messages WHERE id = $1', [id]);
  }

  // Find client by email
  async findClientByEmail(email: string): Promise<Company | null> {
    const result = await this.pool.query('SELECT * FROM companies WHERE email = $1', [email]);
    return result.rows[0] ? this.mapCompany(result.rows[0]) : null;
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

  // Find or create project with stable token for customer
  async findOrCreateCustomerProject(email: string, name: string): Promise<{ projectId: number; token: string }> {
    try {
      // First, try to find existing client by email
      const existingClient = await this.findClientByEmail(email);
      
      if (existingClient) {
        console.log(`✅ Found existing client: ${existingClient.name} (ID: ${existingClient.id})`);
        
        // Find their existing project
        const projects = await this.getProjectsByCompany(existingClient.id!);
        if (projects.length > 0) {
          const project = projects[0]; // Use first project
          console.log(`🔗 Using existing project: ${project.title} (Token: ${project.accessToken})`);
          return { projectId: project.id!, token: project.accessToken! };
        }
      }
      
      // Generate stable token for this customer
      const stableToken = this.generateStableToken(email);
      
      // Create new client and project with stable token
      const company = await this.createCompany({
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
      
      const project = await this.createProject({
        title: `${name} - Website Project`,
        companyId: company.id!,
        type: 'website',
        stage: 'planning',
        status: 'active',
        accessToken: stableToken,
        notes: `Project created from Squarespace messaging widget - ${new Date().toISOString()}`,
        totalAmount: 0,
        paidAmount: 0
      });
      
      console.log(`✅ Created new project with stable token: ID ${project.id}, Token: ${stableToken}`);
      return { projectId: project.id!, token: stableToken };
      
    } catch (error) {
      console.error('❌ Error in findOrCreateCustomerProject:', error);
      throw error;
    }
  }
} 