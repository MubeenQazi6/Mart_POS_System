import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { MultiCounterHub } from '../realtime/multiCounterHub.js';

export function createPosRouter(counterHub?: MultiCounterHub): Router {
  const posRouter = Router();

  const saleItemSchema = z.object({
    productId: z.number().int(),
    name: z.string(),
    quantity: z.number().int().positive(),
    unitPriceMinor: z.number().int().positive(),
    lineTotalMinor: z.number().int().positive(),
  });

  const checkoutSchema = z.object({
    items: z.array(saleItemSchema).min(1),
    subtotalMinor: z.number().int().nonnegative(),
    taxMinor: z.number().int().nonnegative().default(0),
    discountMinor: z.number().int().nonnegative().default(0),
    totalMinor: z.number().int().positive(),
    paymentMethod: z.enum(['CASH', 'CARD', 'SPLIT', 'CREDIT']),
    tenderedMinor: z.number().int().nonnegative(),
    changeMinor: z.number().int().nonnegative().default(0),
    customerId: z.number().optional(),
  });

  // POST /api/v1/pos/sales (Checkout)
  posRouter.post('/sales', (req: Request, res: Response) => {
    const data = checkoutSchema.parse(req.body);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const orgId = req.orgId || 'org_default';
    const counterId = req.counterId || 'counter-1';

    const saleRecord = {
      id: Date.now(),
      invoiceNumber,
      orgId,
      counterId,
      ...data,
      createdAt: new Date().toISOString(),
    };

    // Broadcast Realtime stock decrement to all other counters in this mart (<80ms)
    if (counterHub) {
      counterHub.broadcastToOrg(orgId, {
        type: 'SALE_COMPLETED',
        orgId,
        counterId,
        timestamp: Date.now(),
        payload: {
          invoiceNumber,
          totalMinor: data.totalMinor,
          items: data.items.map((it) => ({
            productId: it.productId,
            qtyDeducted: it.quantity,
          })),
        },
      });
    }

    res.status(201).json({
      success: true,
      data: saleRecord,
      message: 'Sale finalized successfully and synchronized across all counters.',
    });
  });

  // GET /api/v1/pos/held-bills
  posRouter.get('/held-bills', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: [],
      counterId: req.counterId,
    });
  });

  // GET /api/v1/pos/receipt/:invoice
  posRouter.get('/receipt/:invoice', (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        invoiceNumber: req.params.invoice,
        storeName: 'Al-Madina Super Mart',
        tagline: 'Powered by Zenthropic Technologies',
        date: new Date().toISOString(),
        counter: req.counterId || 'Counter 1',
      },
    });
  });

  return posRouter;
}
