import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test company
  const testCompany = await prisma.company.upsert({
    where: { email: 'test@pleasantcovedesign.com' },
    update: {},
    create: {
      name: 'Pleasant Cove Design',
      email: 'test@pleasantcovedesign.com',
      phone: '+1 (555) 123-4567',
      address: '123 Design Street',
      city: 'Portland',
      state: 'Maine',
      industry: 'Design & Consulting',
      website: 'https://pleasantcovedesign.com'
    }
  });

  console.log('✅ Created test company:', testCompany.name);

  // Create test project with stable token
  const testProject = await prisma.project.upsert({
    where: { accessToken: 'test-project-token-123' },
    update: {},
    create: {
      title: 'Website Redesign Project',
      description: 'Complete website redesign and branding refresh',
      type: 'Website Design',
      stage: 'In Progress',
      status: 'active',
      accessToken: 'test-project-token-123',
      totalAmount: 5000,
      paidAmount: 2500,
      notes: 'Client prefers modern, clean design with responsive layout',
      companyId: testCompany.id
    }
  });

  console.log('✅ Created test project with token:', testProject.accessToken);

  // Create some sample messages
  const sampleMessages = [
    {
      senderType: 'admin',
      senderName: 'Pleasant Cove Design',
      content: 'Welcome to your project portal! We\'re excited to work with you on your website redesign.',
      projectId: testProject.id
    },
    {
      senderType: 'client',
      senderName: 'Test Client',
      content: 'Thank you! Looking forward to seeing the progress.',
      projectId: testProject.id
    },
    {
      senderType: 'admin',
      senderName: 'Pleasant Cove Design',
      content: 'I\'ve started working on the initial mockups. I\'ll share them with you by end of week.',
      projectId: testProject.id
    }
  ];

  for (const message of sampleMessages) {
    await prisma.projectMessage.create({
      data: message
    });
  }

  console.log(`✅ Created ${sampleMessages.length} sample messages`);

  // Create some sample activities
  const activities = [
    {
      type: 'project_created',
      description: 'Website redesign project created',
      companyId: testCompany.id,
      projectId: testProject.id
    },
    {
      type: 'message_sent',
      description: 'Welcome message sent to client',
      companyId: testCompany.id,
      projectId: testProject.id
    },
    {
      type: 'payment_received',
      description: 'Initial payment of $2,500 received',
      companyId: testCompany.id,
      projectId: testProject.id
    }
  ];

  for (const activity of activities) {
    await prisma.activity.create({
      data: activity
    });
  }

  console.log(`✅ Created ${activities.length} sample activities`);

  // Create some legacy business records for backward compatibility
  const testBusiness = await prisma.business.create({
    data: {
      name: 'Acme Consulting',
      email: 'contact@acmeconsulting.com',
      phone: '+1 (555) 987-6543',
      address: '456 Business Ave',
      city: 'Boston',
      state: 'Massachusetts',
      businessType: 'Professional Services',
      stage: 'qualified',
      notes: 'Interested in complete rebrand and website overhaul',
      website: 'https://acmeconsulting.com',
      score: 85,
      priority: 'high',
      source: 'referral',
      companyId: testCompany.id
    }
  });

  console.log('✅ Created test business:', testBusiness.name);

  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('📋 Test Data Summary:');
  console.log(`   Company: ${testCompany.name} (${testCompany.email})`);
  console.log(`   Project: ${testProject.title}`);
  console.log(`   Access Token: ${testProject.accessToken}`);
  console.log(`   Messages: ${sampleMessages.length} created`);
  console.log(`   Activities: ${activities.length} created`);
  console.log(`   Businesses: 1 created`);
  console.log('');
  console.log('🧪 Test URLs:');
  console.log(`   Widget: test-messaging-simple.html (token: ${testProject.accessToken})`);
  console.log(`   API: http://localhost:3000/api/public/project/${testProject.accessToken}/messages`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  }); 