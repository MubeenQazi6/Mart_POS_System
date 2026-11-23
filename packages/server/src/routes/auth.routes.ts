import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

export const authRouter = Router();

const registerSchema = z.object({
  fullName: z.string().min(2),
  storeName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/v1/auth/register
authRouter.post('/register', (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userId = `usr_${Date.now()}`;

  // 3-Day Pro Trial Expiry
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 3);

  const token = `zenthropic_jwt_${Date.now()}_${userId}`;

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: userId,
        orgId,
        email: data.email,
        fullName: data.fullName,
        storeName: data.storeName,
        role: 'owner',
        plan: 'trial',
        trialEndsAt: trialEnds.toISOString(),
      },
    },
    message: 'Mart account successfully created with 3-Day Pro Trial.',
  });
});

// POST /api/v1/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const token = `zenthropic_jwt_${Date.now()}`;

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: 'usr_admin',
        orgId: 'org_al_madina',
        email: data.email,
        fullName: 'Super Admin',
        storeName: 'Al-Madina Super Mart',
        role: 'owner',
        plan: 'trial',
      },
    },
  });
});

// GET /api/v1/auth/me
authRouter.get('/me', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      id: req.userId || 'usr_admin',
      orgId: req.orgId || 'org_al_madina',
      role: req.userRole || 'owner',
      counterId: req.counterId || 'counter-1',
    },
  });
});
