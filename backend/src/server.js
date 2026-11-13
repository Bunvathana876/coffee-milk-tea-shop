import express from 'express';
import cors from 'cors';
import { config, validateProductionConfig, isProductionOrStaging } from './config.js';
import { getDatabase, closeDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Auto-seed on startup if needed and listen
export async function startServer(port = config.port) {
  validateProductionConfig();
  // Initialize database schema and seed default data in development only
  await getDatabase();
  if (!isProductionOrStaging()) {
    await seedDatabase();
  }

  return new Promise(resolve => {
    const server = app.listen(port, () => {
      console.log(
        `☕ Coffee & Milk Tea Shop Node.js Backend is running on http://localhost:${port}`,
      );
      console.log(`👉 Health check: http://localhost:${port}/api/health`);
      resolve(server);
    });
  });
}

// Start immediately if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer()
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
    .catch(() => {
      console.error(
        'Server startup failed. Check configuration, database readiness and migration state.',
      );
      process.exit(1);
    });
}

export default app;
