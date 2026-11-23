import { Router, type Request, type Response } from 'express';

export const masterAdminRouter = Router();

// Mock list of all registered customer marts across the ecosystem
const ALL_REGISTERED_MARTS = [
  {
    orgId: 'org_al_madina',
    name: 'Al-Madina Super Mart',
    ownerEmail: 'owner@almadina.pk',
    phone: '0300-9876543',
    city: 'Lahore',
    plan: 'Pro Trial (Day 1 of 3)',
    status: 'ACTIVE',
    countersCount: 2,
    createdAt: '2026-11-20',
  },
  {
    orgId: 'org_metro_hyper',
    name: 'Metro Cash & Carry Hub',
    ownerEmail: 'admin@metrokarachi.com',
    phone: '0321-5554321',
    city: 'Karachi',
    plan: 'Enterprise (Annual)',
    status: 'ACTIVE',
    countersCount: 6,
    createdAt: '2026-11-18',
  },
];

// GET /api/v1/master-admin/organizations (View all marts)
masterAdminRouter.get('/organizations', (_req: Request, res: Response) => {
  res.json({
    success: true,
    totalMarts: ALL_REGISTERED_MARTS.length,
    totalActiveCounters: 8,
    data: ALL_REGISTERED_MARTS,
  });
});

// POST /api/v1/master-admin/organizations/:orgId/extend-trial
masterAdminRouter.post('/organizations/:orgId/extend-trial', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: `Trial for ${req.params.orgId} extended by 7 days.`,
  });
});
