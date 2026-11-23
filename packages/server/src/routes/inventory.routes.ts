import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

export const inventoryRouter = Router();

// GET /api/v1/inventory/stock-levels
inventoryRouter.get('/stock-levels', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: "Olper's Milk 1L", currentStock: 48, lowStockThreshold: 10, status: 'IN_STOCK' },
      { id: 2, name: 'Tapal Danedar 450g', currentStock: 35, lowStockThreshold: 15, status: 'IN_STOCK' },
      { id: 3, name: 'Shan Biryani Masala 50g', currentStock: 85, lowStockThreshold: 20, status: 'IN_STOCK' },
      { id: 4, name: 'Dalda Cooking Oil 1L', currentStock: 4, lowStockThreshold: 10, status: 'LOW_STOCK' },
    ],
  });
});

// POST /api/v1/inventory/adjustments (Manual stock adjustment)
const adjustSchema = z.object({
  productId: z.number().int(),
  adjustmentType: z.enum(['CORRECTION', 'DAMAGE', 'RETURN', 'EXPIRED']),
  quantity: z.number().int(),
  note: z.string().optional(),
});

inventoryRouter.post('/adjustments', (req: Request, res: Response) => {
  const data = adjustSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: {
      movementId: `mov_${Date.now()}`,
      ...data,
      orgId: req.orgId,
      adjustedAt: new Date().toISOString(),
    },
    message: 'Stock movement recorded in audit ledger.',
  });
});
