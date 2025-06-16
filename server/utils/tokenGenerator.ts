import crypto from 'crypto';

/**
 * Generate cryptographically secure unique token for project conversations
 * Format: timestamp_randomBytes for uniqueness and security
 */
export function generateUniqueToken(): string {
  // Generate cryptographically secure random token
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(16).toString('base64url');
  return `${timestamp}_${randomBytes}`;
}

/**
 * Generate UUID for unique identifiers
 */
export function generateUniqueId(): string {
  return crypto.randomUUID();
}

/**
 * Generate unique submission ID for form tracking
 * Format: sub_timestamp_random for audit trail
 */
export function generateSubmissionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `sub_${timestamp}_${random}`;
}

/**
 * Validate token format for security
 */
export function validateTokenFormat(token: string): boolean {
  // Token should match our format: timestamp_base64url
  return /^[a-zA-Z0-9_-]+$/.test(token) && token.length >= 10;
}

/**
 * Generate conversation metadata for audit trails
 */
export function generateConversationMetadata(source: string, email: string) {
  return {
    source,
    submissionTimestamp: Date.now(),
    submissionId: generateSubmissionId(),
    userEmail: email,
    ipAddress: 'tracked_separately', // Will be populated by middleware
    userAgent: 'tracked_separately', // Will be populated by middleware
    createdAt: new Date().toISOString(),
    securityLevel: 'standard',
    isolationEnabled: true
  };
}

/**
 * Enhanced token with metadata for production security
 */
export interface SecureProjectToken {
  token: string;
  submissionId: string;
  metadata: {
    source: string;
    submissionTimestamp: number;
    email: string;
    securityLevel: string;
    isolationEnabled: boolean;
    createdAt: string;
  };
}

/**
 * Generate secure project token with full metadata
 */
export function generateSecureProjectToken(source: string, email: string): SecureProjectToken {
  const token = generateUniqueToken();
  const submissionId = generateSubmissionId();
  
  return {
    token,
    submissionId,
    metadata: {
      source,
      submissionTimestamp: Date.now(),
      email,
      securityLevel: 'production',
      isolationEnabled: true,
      createdAt: new Date().toISOString()
    }
  };
} 