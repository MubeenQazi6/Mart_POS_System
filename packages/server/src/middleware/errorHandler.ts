import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[API Server Error]:', err);

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  // Handle standard Error
  if (err instanceof Error) {
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
      code: 'SERVER_ERROR',
    });
    return;
  }

  // Unknown error
  res.status(500).json({
    success: false,
    error: 'An unexpected internal error occurred',
    code: 'UNKNOWN_ERROR',
  });
}
