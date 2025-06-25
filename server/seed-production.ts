import { PostgreSQLStorage } from './postgres-storage.js';

async function seedProductionDatabase() {
  console.log('🌱 Starting production database seeding...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('⚠️ No DATABASE_URL found, skipping seed (will use in-memory storage)');
    return;
  }

  try {
    const storage = new PostgreSQLStorage(databaseUrl);
    
    // Check if data already exists
    const existingCompanies = await storage.getCompanies();
    if (existingCompanies.length > 0) {
      console.log(`✅ Database already seeded with ${existingCompanies.length} companies`);
      return;
    }

    // Create demo company for testing
    const demoCompany = await storage.createCompany({
      name: 'Demo Client',
      email: 'demo@pleasantcovedesign.com',
      phone: '(555) 123-4567',
      address: '123 Demo Street',
      city: 'Demo City',
      state: 'CA',
      industry: 'Technology',
      website: 'https://demo.example.com',
      priority: 'high',
      tags: ['demo', 'test-client']
    });

    // Create demo project with stable token
    const demoProject = await storage.createProject({
      title: 'Demo Website Project',
      companyId: demoCompany.id!,
      type: 'website',
      stage: 'development',
      status: 'active',
      accessToken: 'demo-project-token-123',
      notes: 'Demo project for testing production messaging system',
      totalAmount: 5000,
      paidAmount: 2500
    });

    // Create initial welcome message
    await storage.createProjectMessage({
      projectId: demoProject.id!,
      senderType: 'admin',
      senderName: 'Pleasant Cove Design',
      content: 'Welcome to your project portal! This is where we\'ll communicate about your website project. Feel free to send messages and share files.',
      attachments: []
    });

    console.log('✅ Production database seeded successfully!');
    console.log(`📊 Created: 1 company, 1 project, 1 message`);
    console.log(`🔑 Demo project token: demo-project-token-123`);
    
  } catch (error) {
    console.error('❌ Error seeding production database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProductionDatabase();
} 