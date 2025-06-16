// @ts-nocheck
import { storage } from "./storage";
import type { Business } from "@shared/schema";

// Mock outreach service for development
// In production, this would integrate with SMS/email APIs like Twilio, SendGrid, etc.

export interface OutreachResult {
  success: boolean;
  message: string;
  contactId?: string;
  error?: string;
}

export class OutreachService {
  
  // Launch outreach for a specific lead
  async launchOutreachForLead(businessId: number): Promise<OutreachResult> {
    try {
      const business = await storage.getBusinessById(businessId);
      if (!business) {
        return {
          success: false,
          message: "Business not found",
          error: "BUSINESS_NOT_FOUND"
        };
      }

      // Determine outreach method based on available contact info
      const hasPhone = business.phone && business.phone !== "No phone provided";
      const hasEmail = business.email && business.email.includes("@");

      let outreachMethod = "sms";
      let contactInfo = business.phone;

      if (!hasPhone && hasEmail) {
        outreachMethod = "email";
        contactInfo = business.email!;
      } else if (!hasPhone && !hasEmail) {
        return {
          success: false,
          message: "No valid contact information available",
          error: "NO_CONTACT_INFO"
        };
      }

      // Generate personalized message based on business type and score
      const message = this.generatePersonalizedMessage(business);

      // Simulate outreach (in production, call actual SMS/email API)
      const result = await this.sendMessage(outreachMethod, contactInfo, message, business);

      if (result.success) {
        // Log successful outreach activity
        await storage.createActivity({
          type: `${outreachMethod}_sent`,
          description: `${outreachMethod.toUpperCase()} sent to ${business.name}: "${message.substring(0, 50)}..."`,
          businessId: business.id!
        });

        // Update business stage if it was just scraped
        if (business.stage === "scraped") {
          await storage.updateBusinessStage(business.id!, "contacted");
        }

        // Update last contact date
        await storage.updateBusiness(business.id!, {
          lastContactDate: new Date().toISOString()
        });
      }

      return result;

    } catch (error) {
      console.error("Failed to launch outreach for lead:", error);
      return {
        success: false,
        message: "Internal error occurred",
        error: "INTERNAL_ERROR"
      };
    }
  }

  // Launch bulk outreach campaign
  async launchBulkOutreach(campaignData: {
    businessType?: string;
    stage?: string;
    priority?: string;
    message: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    results: OutreachResult[];
  }> {
    try {
      // Get businesses based on criteria
      let businesses = await storage.getBusinesses();

      // Apply filters
      if (campaignData.businessType) {
        businesses = businesses.filter(b => b.businessType === campaignData.businessType);
      }
      if (campaignData.stage) {
        businesses = businesses.filter(b => b.stage === campaignData.stage);
      }
      if (campaignData.priority) {
        businesses = businesses.filter(b => b.priority === campaignData.priority);
      }

      // Limit results
      if (campaignData.limit) {
        businesses = businesses.slice(0, campaignData.limit);
      }

      const results: OutreachResult[] = [];
      let sent = 0;
      let failed = 0;

      // Send to each business with delay to avoid rate limiting
      for (const business of businesses) {
        const result = await this.sendMessage(
          business.email ? "email" : "sms",
          business.email || business.phone,
          campaignData.message,
          business
        );

        results.push(result);

        if (result.success) {
          sent++;
          // Log activity
          await storage.createActivity({
            type: "bulk_outreach_sent",
            description: `Bulk campaign message sent to ${business.name}`,
            businessId: business.id!
          });
        } else {
          failed++;
        }

        // Small delay to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create campaign record
      await storage.createCampaign({
        name: `Bulk Campaign ${new Date().toLocaleDateString()}`,
        businessType: campaignData.businessType || "all",
        totalContacts: businesses.length,
        sentCount: sent,
        responseCount: 0, // Will be updated when responses come in
        message: campaignData.message,
        status: "completed"
      });

      return {
        success: true,
        sent,
        failed,
        results
      };

    } catch (error) {
      console.error("Failed to launch bulk outreach:", error);
      return {
        success: false,
        sent: 0,
        failed: 0,
        results: []
      };
    }
  }

  // Generate personalized message based on business data
  private generatePersonalizedMessage(business: Business): string {
    const firstName = business.name.split(' ')[0];
    const businessType = business.businessType;

    // High-score leads get priority messaging
    if ((business.score || 0) >= 80) {
      return `Hi ${firstName}! I saw your interest in professional website design for your ${businessType} business. I specialize in helping ${businessType} companies get more customers online. I have immediate availability this week - would you like to see some examples of my work? Quick 15-min call? - Pleasant Cove Design`;
    }

    // Medium-score leads get standard messaging
    if ((business.score || 0) >= 60) {
      return `Hello ${firstName}, I help ${businessType} businesses grow with professional websites that actually bring in customers. Would you be interested in seeing some examples of my recent work? Takes just 5 minutes to show you what's possible. - Pleasant Cove Design`;
    }

    // Default message for lower-score leads
    return `Hi ${firstName}, I noticed you might be interested in web design services for ${businessType} businesses. I specialize in creating websites that help local businesses get more customers. Would you like to see some quick examples? - Pleasant Cove Design`;
  }

  // Mock message sending (replace with real SMS/email APIs)
  private async sendMessage(
    method: string, 
    contactInfo: string, 
    message: string, 
    business: Business
  ): Promise<OutreachResult> {
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate 95% success rate
    const isSuccessful = Math.random() > 0.05;

    if (isSuccessful) {
      console.log(`📧 ${method.toUpperCase()} sent to ${business.name} (${contactInfo}): ${message.substring(0, 50)}...`);
      
      return {
        success: true,
        message: `${method.toUpperCase()} sent successfully`,
        contactId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      console.log(`❌ Failed to send ${method.toUpperCase()} to ${business.name} (${contactInfo})`);
      
      return {
        success: false,
        message: `Failed to send ${method.toUpperCase()}`,
        error: "DELIVERY_FAILED"
      };
    }
  }

  // Handle incoming responses (webhook endpoint)
  async handleIncomingResponse(responseData: {
    from: string;
    message: string;
    timestamp: string;
    type: 'sms' | 'email';
  }): Promise<void> {
    try {
      // Find business by phone/email
      const businesses = await storage.searchBusinesses(responseData.from);
      
      if (businesses.length > 0) {
        const business = businesses[0];
        
        // Log the response
        await storage.createActivity({
          type: `${responseData.type}_response`,
          description: `Response received: "${responseData.message}"`,
          businessId: business.id!
        });

        // Update business stage if they responded
        if (business.stage === "contacted") {
          await storage.updateBusinessStage(business.id!, "responded");
        }

        // Analyze response sentiment and update score
        const isPositive = this.analyzeResponseSentiment(responseData.message);
        if (isPositive && (business.score || 0) < 80) {
          await storage.updateBusinessScore(business.id!, Math.min((business.score || 0) + 20, 100));
        }

        console.log(`📨 Response received from ${business.name}: ${responseData.message}`);
      }
    } catch (error) {
      console.error("Failed to handle incoming response:", error);
    }
  }

  // Simple sentiment analysis
  private analyzeResponseSentiment(message: string): boolean {
    const positiveWords = ['yes', 'interested', 'sure', 'ok', 'please', 'show', 'tell', 'more', 'when', 'how'];
    const negativeWords = ['no', 'not', 'stop', 'remove', 'unsubscribe', 'don\'t'];
    
    const lowerMessage = message.toLowerCase();
    const hasPositive = positiveWords.some(word => lowerMessage.includes(word));
    const hasNegative = negativeWords.some(word => lowerMessage.includes(word));
    
    return hasPositive && !hasNegative;
  }
}

// Export singleton instance and convenience functions
export const outreachService = new OutreachService();

export const launchOutreachForLead = (businessId: number) => 
  outreachService.launchOutreachForLead(businessId);

export const launchBulkOutreach = (campaignData: any) => 
  outreachService.launchBulkOutreach(campaignData); 