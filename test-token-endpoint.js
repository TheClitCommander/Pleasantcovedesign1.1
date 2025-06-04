// Test script for the enhanced /api/new-lead endpoint
// Run with: node test-token-endpoint.js

const testData = [
  {
    name: "John Smith",
    email: "john@smithplumbing.com",
    phone: "555-123-4567",
    message: "I need a new website for my plumbing business",
    business_name: "Smith Plumbing",
    service_type: "plumbing"
  },
  {
    name: "Sarah Johnson", 
    email: "sarah@johnsonelectric.com",
    phone: "555-987-6543",
    message: "Looking for website design services",
    business_name: "Johnson Electric",
    service_type: "electrical"
  },
  {
    name: "John Smith",
    email: "john@smithplumbing.com", // Same email as first test
    phone: "555-123-4567",
    message: "Follow up message from existing lead",
    business_name: "Smith Plumbing"
  }
];

async function testEndpoint() {
  const baseUrl = 'http://localhost:5174';
  
  console.log('🧪 Testing Enhanced /api/new-lead Endpoint\n');
  
  for (let i = 0; i < testData.length; i++) {
    const testCase = testData[i];
    console.log(`📝 Test ${i + 1}: ${testCase.name} (${testCase.email})`);
    
    try {
      const response = await fetch(`${baseUrl}/api/new-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Success!');
        console.log(`   Business ID: ${result.businessId}`);
        console.log(`   Lead Score: ${result.leadScore}`);
        console.log(`   Priority: ${result.priority}`);
        console.log(`   Project Token: ${result.projectToken || 'None'}`);
        if (result.messagingUrl) {
          console.log(`   Messaging URL: ${result.messagingUrl}`);
        }
        if (result.clientPortalUrl) {
          console.log(`   Client Portal: ${result.clientPortalUrl}`);
        }
      } else {
        console.log('❌ Failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Network Error:', error.message);
    }
    
    console.log(''); // Empty line for readability
    
    // Wait 1 second between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎯 Testing Instructions:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Run this test: node test-token-endpoint.js');
  console.log('3. Check that the same email gets the same project token');
  console.log('4. Verify tokens are saved and reused correctly');
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEndpoint();
}

export { testEndpoint }; 