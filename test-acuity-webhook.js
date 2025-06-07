#!/usr/bin/env node

// Test script for Acuity Appointment Webhook
const testAcuityWebhook = async () => {
    const webhookUrl = 'http://localhost:5174/api/acuity-appointment';
    
    // Sample Acuity webhook payload
    const sampleAppointment = {
        id: '12345678',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // +30 minutes
        duration: 30,
        appointmentTypeID: '1234',
        appointmentType: 'Design Consultation',
        notes: 'Client wants to discuss website redesign for their business',
        action: 'scheduled'
    };
    
    console.log('🧪 Testing Acuity webhook with sample data...');
    console.log('📋 Sample appointment:', JSON.stringify(sampleAppointment, null, 2));
    
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Acuity-Webhooks/1.0'
            },
            body: JSON.stringify(sampleAppointment)
        });
        
        const result = await response.text();
        
        console.log('📬 Response Status:', response.status);
        console.log('📄 Response Body:', result);
        
        if (response.ok) {
            console.log('✅ Webhook test PASSED!');
            const parsed = JSON.parse(result);
            if (parsed.projectToken) {
                console.log('🎯 Generated project token:', parsed.projectToken);
                console.log('🔗 Client can access their appointments at:');
                console.log(`   http://localhost:5173/squarespace-widgets/smart-client-portal.html`);
                console.log('🔗 Admin can view appointment at:');
                console.log(`   http://localhost:5173/api/appointments?token=pleasantcove2024admin`);
            }
        } else {
            console.log('❌ Webhook test FAILED!');
        }
        
    } catch (error) {
        console.error('💥 Test error:', error.message);
        console.log('❌ Make sure your server is running on port 5174');
    }
};

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

testAcuityWebhook(); 