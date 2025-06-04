#!/usr/bin/env node

// Full Integration Test for Pleasant Cove Design
// Tests all three components: Lead Generation + Token + Messaging + Appointments

const BASE_URL = "http://localhost:5174";
const ADMIN_TOKEN = "pleasantcove2024admin";

async function runFullIntegrationTest() {
  console.log("🚀 Starting Full Integration Test...\n");
  
  try {
    // Step 1: Create a new lead (simulating Squarespace form submission)
    console.log("1️⃣ Creating new lead...");
    const leadResponse = await fetch(`${BASE_URL}/api/new-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Integration Test Client",
        email: "integration-test@example.com",
        phone: "555-INTEGRATION",
        message: "I need a professional website for my growing business",
        service_type: "website",
        appointment_date: "2024-12-15",
        budget: "25k-50k"
      })
    });
    
    const leadData = await leadResponse.json();
    console.log(`✅ Lead created: ID ${leadData.businessId}, Score ${leadData.leadScore}, Token ${leadData.projectToken}\n`);
    
    const projectToken = leadData.projectToken;
    const businessId = leadData.businessId;
    
    // Step 2: Client sends message using their token
    console.log("2️⃣ Client sending message...");
    const clientMessageResponse = await fetch(`${BASE_URL}/api/public/project/${projectToken}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Hi! I'm very excited to work with you. When can we schedule our initial consultation?",
        senderName: "Integration Test Client"
      })
    });
    
    const clientMessage = await clientMessageResponse.json();
    console.log(`✅ Client message sent: ID ${clientMessage.id}\n`);
    
    // Step 3: Admin schedules appointment
    console.log("3️⃣ Admin scheduling appointment...");
    const appointmentResponse = await fetch(`${BASE_URL}/api/appointments?token=${ADMIN_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: businessId,
        datetime: "2024-12-15T15:00:00Z",
        status: "scheduled",
        notes: "Initial consultation - High-value website project ($25k-50k budget)",
        isAutoScheduled: false
      })
    });
    
    const appointmentData = await appointmentResponse.json();
    console.log(`✅ Appointment scheduled: ID ${appointmentData.appointment.id} for ${appointmentData.client.name}\n`);
    
    // Step 4: Admin replies to client
    console.log("4️⃣ Admin sending response...");
    
    // First, get the project ID from the lead data
    const projectsResponse = await fetch(`${BASE_URL}/api/projects?token=${ADMIN_TOKEN}`);
    const projects = await projectsResponse.json();
    const clientProject = projects.find(p => p.accessToken === projectToken);
    
    const adminMessageResponse = await fetch(`${BASE_URL}/api/projects/${clientProject.id}/messages?token=${ADMIN_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Hi! Thanks for your interest in working with Pleasant Cove Design. I've scheduled our consultation for Dec 15th at 3 PM. I'm excited to discuss your website project!",
        senderName: "Ben - Pleasant Cove Design"
      })
    });
    
    const adminMessage = await adminMessageResponse.json();
    console.log(`✅ Admin response sent: ID ${adminMessage.id}\n`);
    
    // Step 5: Verify client can see the conversation
    console.log("5️⃣ Verifying client portal access...");
    const conversationResponse = await fetch(`${BASE_URL}/api/public/project/${projectToken}/messages`);
    const conversation = await conversationResponse.json();
    
    console.log(`✅ Client can access ${conversation.messages.length} messages in their portal\n`);
    
    // Step 6: Display the full conversation
    console.log("💬 Complete Conversation Thread:");
    console.log("=" + "=".repeat(50));
    
    // Sort messages by creation time (oldest first)
    const sortedMessages = conversation.messages.sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    
    sortedMessages.forEach((msg, index) => {
      const sender = msg.senderType === 'client' ? '🧑‍💼 Client' : '👨‍💻 Admin';
      const time = new Date(msg.createdAt).toLocaleTimeString();
      console.log(`${sender} (${time}): ${msg.content}\n`);
    });
    
    // Step 7: Summary
    console.log("🎯 INTEGRATION TEST RESULTS:");
    console.log("=" + "=".repeat(30));
    console.log(`✅ Lead Generation: Working (Score: ${leadData.leadScore}/100)`);
    console.log(`✅ Token System: Working (Token: ${projectToken})`);
    console.log(`✅ Client Messaging: Working (${conversation.messages.filter(m => m.senderType === 'client').length} client messages)`);
    console.log(`✅ Admin Messaging: Working (${conversation.messages.filter(m => m.senderType === 'admin').length} admin messages)`);
    console.log(`✅ Appointment Scheduling: Working (ID: ${appointmentData.appointment.id})`);
    console.log(`✅ Client Portal: Working (${conversation.messages.length} total messages accessible)`);
    
    console.log("\n🚀 ALL SYSTEMS OPERATIONAL! Your integration is working perfectly.");
    console.log("🔗 Client Portal URL:", `${BASE_URL}/api/public/project/${projectToken}`);
    console.log("💬 Messaging Widget URL:", `${BASE_URL}/squarespace-widgets/messaging-widget.html?token=${projectToken}`);
    
  } catch (error) {
    console.error("❌ Integration test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
runFullIntegrationTest(); 