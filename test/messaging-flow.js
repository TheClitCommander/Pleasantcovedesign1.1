import fetch from 'node-fetch';

// --- Configuration ---
const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'pleasantcove2024admin';

// Use a known, stable project token for testing
// This should be a token for a project that you don't mind getting test messages
const TEST_PROJECT_TOKEN = 'Ae06uIlLwd2HlhzmojmxEwFt'; 
const SENDER_NAME = 'Automated Integration Test';

// --- Test Runner ---
async function runTest() {
    console.log('🚀 Starting messaging flow integration test...');
    
    const uniqueMessageContent = `Test message at ${new Date().toISOString()}`;
    let messageId = null;

    try {
        // --- Step 1: Send a message as a client ---
        console.log(`\n[Step 1] Sending client message to project ${TEST_PROJECT_TOKEN}...`);
        const sendMessageResponse = await fetch(`${BASE_URL}/api/public/project/${TEST_PROJECT_TOKEN}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: uniqueMessageContent,
                senderName: SENDER_NAME,
                senderType: 'client'
            }),
        });

        if (!sendMessageResponse.ok) {
            throw new Error(`Client message failed with status: ${sendMessageResponse.status}`);
        }

        const sentMessage = await sendMessageResponse.json();
        messageId = sentMessage.id;
        console.log(`✅ Client message sent successfully. Message ID: ${messageId}`);


        // --- Step 2: Wait for broadcast and processing ---
        console.log('\n[Step 2] Waiting 2 seconds for server processing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        

        // --- Step 3: Fetch conversations as an admin ---
        console.log('\n[Step 3] Fetching all conversations as admin...');
        const adminConvoResponse = await fetch(`${BASE_URL}/api/admin/conversations`, {
            headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
        });

        if (!adminConvoResponse.ok) {
            throw new Error(`Admin fetch failed with status: ${adminConvoResponse.status}`);
        }

        const adminData = await adminConvoResponse.json();
        const conversations = adminData.projectMessages;
        console.log(`✅ Admin fetch successful. Found ${conversations.length} conversations.`);

        
        // --- Step 4: Verify the message exists ---
        console.log(`\n[Step 4] Verifying that the test message exists...`);
        const targetConversation = conversations.find(c => c.accessToken === TEST_PROJECT_TOKEN);

        if (!targetConversation) {
            throw new Error(`Verification failed: Test project conversation with token ${TEST_PROJECT_TOKEN} was not found.`);
        }

        const foundMessage = targetConversation.messages.find(m => m.id === messageId);

        if (!foundMessage) {
            throw new Error(`Verification failed: Message with ID ${messageId} was not found in the conversation.`);
        }

        if (foundMessage.content !== uniqueMessageContent) {
            throw new Error(`Verification failed: Message content does not match.
                Expected: "${uniqueMessageContent}"
                Found:    "${foundMessage.content}"
            `);
        }

        console.log('✅ Message content verified successfully.');


        // --- Success ---
        console.log('\n\n=====================================');
        console.log('✅✅✅ SUCCESS: Messaging flow test passed! ✅✅✅');
        console.log('=====================================');
        console.log('You can now run "node test/messaging-flow.js" anytime to confirm the system is working.');

    } catch (error) {
        console.error('\n\n=====================================');
        console.error('❌❌❌ FAILURE: Messaging flow test failed! ❌❌❌');
        console.error('=====================================');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Helper to check if the script is run directly
// In ES Modules, a file is typically the entry point, so we can call runTest directly.
runTest(); 