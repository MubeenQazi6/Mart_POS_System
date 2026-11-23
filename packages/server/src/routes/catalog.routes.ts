import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

export const catalogRouter = Router();

// In-memory Pakistani retail catalog for standard baseline
const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Olper's Milk 1 Litre",
    sku: 'OLP-1L',
    barcode: '8964000123456',
    price_minor: 29000, // PKR 290.00
    cost_minor: 26500,  // PKR 265.00
    stock_qty: 48,
    category: 'Dairy & Eggs',
    is_active: 1,
  },
  {
    id: 2,
    name: 'Tapal Danedar Tea 450g',
    sku: 'TAP-450G',
    barcode: '8964000234567',
    price_minor: 68000, // PKR 680.00
    cost_minor: 61000,
    stock_qty: 35,
    category: 'Beverages',
    is_active: 1,
  },
  {
    id: 3,
    name: 'Shan Biryani Masala 50g',
    sku: 'SHN-50G',
    barcode: '8964000345678',
    price_minor: 12000, // PKR 120.00
    cost_minor: 9500,
    stock_qty: 85,
    category: 'Spices & Recipe Mixes',
    is_active: 1,
  },
  {
    id: 4,
    name: 'Dalda Cooking Oil 1 Litre Pouch',
    sku: 'DAL-1L',
    barcode: '8964000456789',
    price_minor: 54000, // PKR 540.00
    cost_minor: 49500,
    stock_qty: 24,
    category: 'Cooking Essentials',
    is_active: 1,
  },
];

// GET /api/v1/catalog/products
catalogRouter.get('/products', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: MOCK_PRODUCTS,
    total: MOCK_PRODUCTS.length,
  });
});

// GET /api/v1/catalog/barcode/:barcode (sub-millisecond cashier barcode scan)
catalogRouter.get('/barcode/:barcode', (req: Request, res: Response) => {
  const code = String(req.params.barcode || '').trim();
  const found = MOCK_PRODUCTS.find((p) => p.barcode === code || p.sku === code);

  if (!found) {
    res.status(404).json({
      success: false,
      error: `No product found matching barcode ${code}`,
      code: 'BARCODE_NOT_FOUND',
    });
    return;
  }

  res.json({
    success: true,
    data: found,
  });
});

// POST /api/v1/catalog/products
const productCreateSchema = z.object({
  name: z.string().min(2),
  barcode: z.string().min(3),
  price_minor: z.number().int().positive(),
  cost_minor: z.number().int().positive(),
  stock_qty: z.number().default(0),
  category: z.string().default('General'),
});

catalogRouter.post('/products', (req: Request, res: Response) => {
  const input = productCreateSchema.parse(req.body);
  const newProduct = {
    id: Date.now(),
    sku: `SKU-${Date.now().toString().slice(-4)}`,
    ...input,
    is_active: 1,
  };

  res.status(201).json({
    success: true,
    data: newProduct,
    message: 'Product successfully created',
  });
});
