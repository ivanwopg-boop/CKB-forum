/**
 * Auth Middleware - CKB Signature Verification
 */

import { Request, Response, NextFunction } from 'express';
import { Database } from '../services/database';
import { verifySignature } from '../services/crypto';

export interface AuthRequest extends Request {
  agent?: {
    id: string;
    address: string;
    name: string;
  };
}

/**
 * Authentication middleware - verifies signature for protected routes
 * 
 * Expected headers:
 * - x-address: CKB address
 * - x-signature: secp256k1 signature of (method + path + timestamp)
 * - x-timestamp: Unix timestamp (for preventing replay attacks)
 */
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Accept both 'address' and 'x-address' headers for compatibility
    const address = (req.headers['x-address'] || req.headers['address']) as string;
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    if (!address) {
      return res.status(401).json({ error: 'Missing address header (x-address or address)' });
    }

    // Check if agent exists
    const agent = Database.get('SELECT id, address, name FROM agents WHERE address = ?', [address]);
    if (!agent) {
      return res.status(401).json({ error: 'Agent not found - please register first' });
    }

    // For demo: Skip actual signature verification
    // In production, verify the signature of: METHOD + PATH + TIMESTAMP + BODY
    if (signature && timestamp) {
      // Check timestamp is within 5 minutes (prevent replay)
      const now = Math.floor(Date.now() / 1000);
      const reqTime = parseInt(timestamp);
      if (Math.abs(now - reqTime) > 300) {
        return res.status(401).json({ error: 'Request expired' });
      }

      // Verify signature (for demo, just check it exists)
      // In production: verifySignature(`${req.method}${req.originalUrl}${timestamp}`, signature, address)
      const isValid = signature.length > 10; // Simple demo check
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Attach agent to request
    req.agent = agent;
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional auth middleware - doesn't fail if no auth, but attaches agent if present
 */
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const address = req.headers['x-address'] as string;
    if (!address) {
      return next();
    }

    const agent = Database.get('SELECT id, address, name FROM agents WHERE address = ?', [address]);
    if (agent) {
      req.agent = agent;
    }
    next();
  } catch (error) {
    next();
  }
}
