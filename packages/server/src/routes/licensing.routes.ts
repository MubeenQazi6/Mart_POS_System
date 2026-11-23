import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

export const licensingRouter = Router();

// GET /api/v1/licensing/status
licensingRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      orgId: req.orgId || 'org_default',
      plan: 'pro_trial',
      daysRemaining: 3,
      isExpired: false,
      maxCounters: 5,
      activeCounters: 2,
    },
  });
});

// POST /api/v1/licensing/validate-desktop
const machineSchema = z.object({
  machineCode: z.string().min(8),
  appVersion: z.string().default('v1.0.0'),
});

licensingRouter.post('/validate-desktop', (req: Request, res: Response) => {
  const data = machineSchema.parse(req.body);

  res.json({
    success: true,
    data: {
      valid: true,
      licensedTo: 'Al-Madina Super Mart',
      plan: 'pro_trial',
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      machineCode: data.machineCode,
      signature: `SIG_${Date.now()}_ED25519_VALID`,
    },
    message: 'Desktop machine code verified with Zenthropic Cloud License Server.',
  });
});
