import { Router, type Request, type Response } from 'express';

export const reportsRouter = Router();

// GET /api/v1/reports/dashboard
reportsRouter.get('/dashboard', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      todayRevenueMinor: 1450000, // PKR 14,500.00
      todayOrdersCount: 28,
      averageBasketMinor: 51800,  // PKR 518.00
      activeSkusCount: 312,
      lowStockAlertsCount: 4,
      counter: req.counterId || 'All Counters',
    },
  });
});

// GET /api/v1/reports/z-report (Daily closure statement)
reportsRouter.get('/z-report', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      date: new Date().toISOString().split('T')[0],
      grossSalesMinor: 1450000,
      returnsMinor: 0,
      netSalesMinor: 1450000,
      cashReceivedMinor: 1120000,
      cardReceivedMinor: 330000,
      taxCollectedMinor: 0,
      totalTransactions: 28,
    },
  });
});
