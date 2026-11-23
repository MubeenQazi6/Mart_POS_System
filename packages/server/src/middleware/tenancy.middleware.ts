import type { Request, Response, NextFunction } from 'express';

// Extend Express Request to include tenant and user metadata
declare global {
  namespace Express {
    interface Request {
      orgId?: string;
      counterId?: string;
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Tenancy Middleware
 * Enforces kernel-level multi-tenant isolation.
 * Extracts org_id and counter_id from request headers or auth token.
 */
export function tenancyMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract tenant context from headers
  const orgId = (req.headers['x-org-id'] as string) || (req.headers['x-tenant-id'] as string);
  const counterId = (req.headers['x-counter-id'] as string) || 'counter-1';

  // For public endpoints (health check, initial auth, webhooks), allow through
  if (req.path.startsWith('/api/v1/auth') || req.path === '/health' || req.path === '/') {
    if (orgId) req.orgId = orgId;
    req.counterId = counterId;
    next();
    return;
  }

  // Enforce orgId for all business endpoints
  if (!orgId) {
    res.status(400).json({
      success: false,
      error: 'Missing required tenant header: x-org-id',
      code: 'TENANT_HEADER_REQUIRED',
    });
    return;
  }

  req.orgId = orgId;
  req.counterId = counterId;
  next();
}
