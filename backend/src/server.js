import express from 'express';
import cors from 'cors';
import { config, validateProductionConfig, isProductionOrStaging } from './config.js';
import { getDatabase, closeDatabase } from './db/database.js';
import { DatabaseDiagnosticError, formatDatabaseFailure } from './db/diagnostics.js';

import healthRouter from './routes/health.js';
import categoriesRouter from './routes/categories.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import customerAuthRouter from './routes/customerAuth.js';

import adminAuthRouter from './routes/admin/auth.js';
import adminCategoriesRouter from './routes/admin/categories.js';
import adminProductsRouter from './routes/admin/products.js';
import adminOrdersRouter from './routes/admin/orders.js';
import adminDashboardRouter from './routes/admin/dashboard.js';
import adminStaffRouter from './routes/admin/staff.js';
import adminCustomersRouter from './routes/admin/customers.js';
import adminSellersRouter from './routes/admin/sellers.js';
import adminStoresRouter from './routes/admin/stores.js';
import sellerAuthRouter from './routes/seller/auth.js';
import sellerStoresRouter from './routes/seller/stores.js';
import sellerOrdersRouter from './routes/seller/orders.js';

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', isProductionOrStaging() ? 1 : false);

app.use((req, res, next) => {
  if (process.env.DEBUG_HTTP === 'true') {
    console.log(`[HTTP IN] ${req.method} ${req.originalUrl} (Host: ${req.headers.host})`);
    res.on('finish', () => {
      console.log(`[HTTP OUT] ${req.method} ${req.originalUrl} -> ${res.statusCode}`);
    });
  }
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  });
  next();
});

// CORS configuration to allow Web and Mobile clients
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. mobile apps, curl) or any configured origin
      if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Idempotency-Key'],
  }),
);

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(422).json({ detail: 'Request body must be a JSON object.' });
  }
  next();
});

// Root info
app.get('/', (req, res) => {
  res.json({
    app: 'Coffee & Milk Tea Shop API',
    version: '1.0.0',
    docs: '/api/health',
    health: '/api/health',
  });
});

// Mount Public & Customer Routes
app.use('/api', healthRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/auth', customerAuthRouter);

// Mount Admin Routes
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/categories', adminCategoriesRouter);
app.use('/api/admin/products', adminProductsRouter);
app.use('/api/admin/orders', adminOrdersRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin', adminDashboardRouter); // for /api/admin/reports/sales
app.use('/api/admin/staff', adminStaffRouter);
app.use('/api/admin/customers', adminCustomersRouter);
app.use('/api/admin/sellers', adminSellersRouter);
app.use('/api/admin/stores', adminStoresRouter);
app.use('/api/seller/auth', sellerAuthRouter);
app.use('/api/seller/stores', sellerStoresRouter);
app.use('/api/seller/orders', sellerOrdersRouter);

// Handle 404 & errors
app.use(notFoundHandler);
app.use(errorHandler);

// Startup only checks/initializes schema; demonstration data is seeded explicitly.
export async function startServer(port = config.port, { readOnlyDatabase = false } = {}) {
  validateProductionConfig();
  // Verification mode opens a read-only local connection without schema or seed writes.
  await getDatabase({ readOnly: readOnlyDatabase });
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      const boundPort = server.address()?.port ?? port;
      console.log(
        `☕ Coffee & Milk Tea Shop Node.js Backend is running on http://localhost:${boundPort}`,
      );
      console.log(`👉 Health check: http://localhost:${boundPort}/api/health`);
      resolve(server);
    });
    server.once('error', reject);
  });
}

// Start immediately if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer(config.port, {
    readOnlyDatabase: process.env.BREW_BOBA_READ_ONLY_STARTUP === 'true',
  })
    .then(server => {
      let stopping = false;
      const shutdown = () => {
        if (stopping) return;
        stopping = true;
        const deadline = setTimeout(() => process.exit(1), 10000);
        deadline.unref();
        server.close(async () => {
          try {
            await closeDatabase();
            process.exit(0);
          } catch {
            process.exit(1);
          }
        });
      };
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    })
    .catch(error => {
      console.error(
        error instanceof DatabaseDiagnosticError
          ? `Server startup failed: ${formatDatabaseFailure(error)}`
          : 'Server startup failed. Check configuration and HTTP listener availability.',
      );
      process.exit(1);
    });
}

export default app;
