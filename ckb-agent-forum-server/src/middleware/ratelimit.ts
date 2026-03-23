/**
 * Rate Limit Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AntiSpamService } from '../services/antispam';

export function rateLimit(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const address = req.headers.address as string;
    
    if (!address) {
      return next(); // No address, let other auth handle it
    }
    
    const result = AntiSpamService.checkAndRecord(address, action);
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: result.message,
        action
      });
    }
    
    // Add rate limit headers
    const status = AntiSpamService.getStatus(address);
    if (status[action]) {
      res.setHeader('X-RateLimit-Limit', status[action].limit);
      res.setHeader('X-RateLimit-Remaining', status[action].remaining);
      res.setHeader('X-RateLimit-Reset', new Date(status[action].resetAt).toISOString());
    }
    
    next();
  };
}
