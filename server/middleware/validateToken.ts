import { Request, Response, NextFunction } from 'express';
import { validateTokenFormat } from '../utils/tokenGenerator.js';

// Extend Request interface to include project
declare global {
  namespace Express {
    interface Request {
      project?: any;
      validatedToken?: string;
      securityMetadata?: {
        tokenValidated: boolean;
        projectExists: boolean;
        ipAddress: string;
        userAgent: string;
        validationTimestamp: number;
      };
    }
  }
}

/**
 * Validate chat token middleware for enhanced security
 */
export function validateChatToken(storage: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body || req.query || req.params;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      console.log(`🔒 [TOKEN_VALIDATION] Validating token: ${token?.substring(0, 10)}... from IP: ${ipAddress}`);

      if (!token) {
        console.error(`❌ [TOKEN_VALIDATION] No token provided from IP: ${ipAddress}`);
        return res.status(400).json({ 
          error: 'Token required',
          code: 'MISSING_TOKEN',
          timestamp: new Date().toISOString()
        });
      }

      // Validate token format
      if (!validateTokenFormat(token)) {
        console.error(`❌ [TOKEN_VALIDATION] Invalid token format: ${token} from IP: ${ipAddress}`);
        return res.status(400).json({ 
          error: 'Invalid token format',
          code: 'INVALID_TOKEN_FORMAT',
          timestamp: new Date().toISOString()
        });
      }

      // Check if token exists and is active
      const project = await storage.getProjectByToken(token);
      if (!project) {
        console.error(`❌ [TOKEN_VALIDATION] Project not found for token: ${token} from IP: ${ipAddress}`);
        return res.status(404).json({ 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }

      // Additional security checks
      if (project.status && project.status !== 'active') {
        console.error(`❌ [TOKEN_VALIDATION] Project inactive: ${project.id} from IP: ${ipAddress}`);
        return res.status(403).json({ 
          error: 'Project not active',
          code: 'PROJECT_INACTIVE',
          timestamp: new Date().toISOString()
        });
      }

      // Attach validated data to request
      req.project = project;
      req.validatedToken = token;
      req.securityMetadata = {
        tokenValidated: true,
        projectExists: true,
        ipAddress,
        userAgent,
        validationTimestamp: Date.now()
      };

      console.log(`✅ [TOKEN_VALIDATION] Token validated successfully: Project ID ${project.id}`);
      next();

    } catch (error) {
      console.error(`❌ [TOKEN_VALIDATION] Validation error:`, error);
      return res.status(500).json({ 
        error: 'Token validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Enhanced security logging middleware
 */
export function securityLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  // Log request start
  console.log(`🔍 [SECURITY_LOG] ${req.method} ${req.path} from IP: ${ipAddress}`);
  
  // Override res.json to log responses
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    if (statusCode >= 400) {
      console.error(`🚨 [SECURITY_LOG] Error response: ${statusCode} ${req.method} ${req.path} (${duration}ms) IP: ${ipAddress}`);
    } else {
      console.log(`✅ [SECURITY_LOG] Success: ${statusCode} ${req.method} ${req.path} (${duration}ms) IP: ${ipAddress}`);
    }
    
    return originalJson.call(this, body);
  };
  
  next();
}

/**
 * Rate limiting for conversation creation (prevent spam)
 */
const conversationCreationAttempts = new Map<string, number[]>();

export function rateLimitConversations(req: Request, res: Response, next: NextFunction) {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minute window
  const maxAttempts = 10; // Max 10 conversations per 5 minutes per IP

  // Get existing attempts for this IP
  const attempts = conversationCreationAttempts.get(ipAddress) || [];
  
  // Filter out old attempts (outside the window)
  const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    console.error(`🚨 [RATE_LIMIT] Too many conversation creation attempts from IP: ${ipAddress}`);
    return res.status(429).json({
      error: 'Too many conversation creation attempts. Please try again later.',
      code: 'RATE_LIMITED',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }

  // Add current attempt
  recentAttempts.push(now);
  conversationCreationAttempts.set(ipAddress, recentAttempts);

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    const cutoff = now - windowMs;
    for (const [ip, timestamps] of conversationCreationAttempts.entries()) {
      const recent = timestamps.filter(ts => ts > cutoff);
      if (recent.length === 0) {
        conversationCreationAttempts.delete(ip);
      } else {
        conversationCreationAttempts.set(ip, recent);
      }
    }
  }

  next();
} 