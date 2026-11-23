import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

export const customersRouter = Router();

// Mock customers list with credit balance
const MOCK_CUSTOMERS = [
  {
    id: 1,
    name: 'Tariq Mehmood',
    phone: '0300-1234567',
    creditLimitMinor: 5000000, // PKR 50,000 max credit
    currentBalanceMinor: 1450000, // PKR 14,500 due (udhaar)
    status: 'ACTIVE',
  },
  {
    id: 2,
    name: 'Haji Aslam Grocers',
    phone: '0321-7654321',
    creditLimitMinor: 10000000,
    currentBalanceMinor: 0,
    status: 'ACTIVE',
  },
];

// GET /api/v1/customers
customersRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: MOCK_CUSTOMERS,
  });
});

// GET /api/v1/customers/:id/ledger (Khata history)
customersRouter.get('/:id/ledger', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      customerId: req.params.id,
      entries: [
        { id: 1, date: '2026-11-20', type: 'SALE_CREDIT', amountMinor: 1450000, balanceMinor: 1450000, invoiceNo: 'INV-00109' },
      ],
    },
  });
});

// POST /api/v1/customers/:id/payments (Customer settles udhaar cash)
const paymentSchema = z.object({
  amountMinor: z.number().int().positive(),
  paymentMethod: z.enum(['CASH', 'ONLINE_TRANSFER', 'CHEQUE']),
  notes: z.string().optional(),
});

customersRouter.post('/:id/payments', (req: Request, res: Response) => {
  const data = paymentSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: {
      receiptNumber: `RCP-${Date.now().toString().slice(-5)}`,
      customerId: req.params.id,
      ...data,
      settledAt: new Date().toISOString(),
    },
    message: 'Customer udhaar payment logged in ledger.',
  });
});
