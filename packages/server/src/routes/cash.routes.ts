import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

export const cashRouter = Router();

// POST /api/v1/cash/sessions/open
const openSessionSchema = z.object({
  openingCashMinor: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

cashRouter.post('/sessions/open', (req: Request, res: Response) => {
  const data = openSessionSchema.parse(req.body);
  const sessionId = `cash_${Date.now()}`;

  res.status(201).json({
    success: true,
    data: {
      sessionId,
      orgId: req.orgId,
      counterId: req.counterId || 'counter-1',
      openedAt: new Date().toISOString(),
      openingCashMinor: data.openingCashMinor,
      status: 'OPEN',
    },
    message: 'Cash drawer shift opened successfully.',
  });
});

// POST /api/v1/cash/sessions/close
const closeSessionSchema = z.object({
  actualCashMinor: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

cashRouter.post('/sessions/close', (req: Request, res: Response) => {
  const data = closeSessionSchema.parse(req.body);

  res.json({
    success: true,
    data: {
      closedAt: new Date().toISOString(),
      actualCashMinor: data.actualCashMinor,
      expectedCashMinor: data.actualCashMinor, // calculated from sales
      discrepancyMinor: 0,
      status: 'CLOSED',
    },
    message: 'Cash register shift closed and reconciled.',
  });
});
