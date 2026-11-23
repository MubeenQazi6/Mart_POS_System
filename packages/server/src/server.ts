import express from 'express';
import http from 'http';
import cors from 'cors';
import { tenancyMiddleware } from './middleware/tenancy.middleware.js';
import { errorHandler } from './middleware/errorHandler.js';
import { MultiCounterHub } from './realtime/multiCounterHub.js';

// Route Handlers
import { authRouter } from './routes/auth.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { createPosRouter } from './routes/pos.routes.js';
import { inventoryRouter } from './routes/inventory.routes.js';
import { customersRouter } from './routes/customers.routes.js';
import { cashRouter } from './routes/cash.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { licensingRouter } from './routes/licensing.routes.js';
import { masterAdminRouter } from './routes/masterAdmin.routes.js';

const app = express();
const server = http.createServer(app);

// Initialize Realtime Multi-Counter WebSocket Mesh
const counterHub = new MultiCounterHub(server);

// Global Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(tenancyMiddleware);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Zenthropic MartPOS Unified Enterprise API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Root welcome
app.get('/', (_req, res) => {
  res.json({
    name: 'MartPOS Enterprise API & Multi-Counter Sync Gateway',
    poweredBy: 'Zenthropic Technologies',
    version: '1.0.0',
    docs: '/api/v1/health',
    realtimeWebSocket: '/ws/counters?org_id={ORG_ID}&counter_id={COUNTER_ID}',
  });
});

// Mount All 13 Module Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/pos', createPosRouter(counterHub));
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/customers', customersRouter);
app.use('/api/v1/cash', cashRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/licensing', licensingRouter);
app.use('/api/v1/master-admin', masterAdminRouter);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 [MartPOS Server] Running on http://localhost:${PORT}`);
  console.log(`📡 [Realtime Mesh] WebSockets listening on ws://localhost:${PORT}/ws/counters`);
  console.log(`👑 [Powered By] Zenthropic Technologies Enterprise Suite`);
  console.log(`==================================================\n`);
});

export { app, server, counterHub };
