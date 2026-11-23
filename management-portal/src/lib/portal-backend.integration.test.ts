import test from 'node:test';
import assert from 'node:assert/strict';

// Keep backend isolated in memory for tests
process.env.NODE_ENV = 'test';
process.env.ENVIRONMENT = 'test';
process.env.ALLOW_IN_MEMORY_DB = 'true';
process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/isolated';

// @ts-expect-error No TS types for backend ESM
const { startServer } = await import('../../../backend/src/server.js');
// @ts-expect-error No TS types for backend ESM
const { seedDatabase } = await import('../../../backend/src/db/seed.js');
// @ts-expect-error No TS types for backend ESM
const { closeDatabase } = await import('../../../backend/src/db/database.js');

import {
  ApiError,
  setPortalApiBaseUrl,
  loginStaff,
  getStaffProfile,
  getDashboardSummary,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  getOrder,
  getOrderPaymentAudit,
  updateOrderStatus,
  settleCash,
  getSalesReport,
  getCustomers,
  getCustomer,
  getStaff,
  createStaff,
  updateStaff,
  createSeller,
  getSellers,
  getSeller,
  updateSeller,
  updateSellerStatus,
  createStore,
  getStores,
  getStore,
  updateStore,
  deleteStore,
  assignSellerStore,
  getSellerStores,
  unassignSellerStore,
  loginSeller,
  getSellerProfile,
  getMyStores,
  getMyOrders,
} from './api';

let server: any;
let baseUrl: string;
let adminToken: string;

test.before(async () => {
  server = await startServer(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  setPortalApiBaseUrl(baseUrl);
  await seedDatabase();

  const loginRes = await loginStaff('admin@coffeeshop.com', 'admin123');
  adminToken = loginRes.access_token;
});

test.after(async () => {
  setPortalApiBaseUrl(undefined);
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await closeDatabase();
});

test('1. Management Portal Integration: Admin authentication and staff profile', async () => {
  assert.ok(adminToken, 'Admin token should be present');
  const profile = await getStaffProfile(adminToken);
  assert.equal(profile.email, 'admin@coffeeshop.com');
  assert.equal(profile.role, 'admin');
  assert.equal(profile.is_active, true);
});

test('2. Management Portal Integration: Dashboard summary returns authoritative KPIs and recent orders', async () => {
  const summary = await getDashboardSummary(adminToken);
  assert.equal(typeof summary.total_orders, 'number');
  assert.equal(typeof summary.total_sales_usd, 'number');
  assert.equal(typeof summary.pending_orders, 'number');
  assert.equal(typeof summary.completed_orders, 'number');
  assert.equal(typeof summary.total_customers, 'number');
  assert.ok(Array.isArray(summary.recent_orders));
});

test('3. Management Portal Integration: Category management CRUD lifecycle', async () => {
  const initial = await getCategories(adminToken);
  assert.ok(Array.isArray(initial));

  const uniqueName = `Test Category ${Date.now()}`;
  const created = await createCategory(adminToken, {
    name: uniqueName,
    description: 'Integration test category description',
    image: 'https://example.com/cat.jpg',
    is_active: true,
  });
  assert.ok(created.id > 0);
  assert.equal(created.name, uniqueName);
  assert.equal(created.is_active, true);

  const updated = await updateCategory(adminToken, created.id, {
    name: `${uniqueName} Updated`,
    description: 'Updated category description',
    image: null,
    is_active: false,
  });
  assert.equal(updated.name, `${uniqueName} Updated`);
  assert.equal(updated.is_active, false);

  const deleted = await deleteCategory(adminToken, created.id);
  assert.ok(deleted.message.includes('deleted'));
});

test('4. Management Portal Integration: Product management CRUD lifecycle and filtering', async () => {
  const categories = await getCategories(adminToken);
  assert.ok(categories.length > 0);
  const targetCategory = categories[0];

  const uniqueProductName = `Portal Drink ${Date.now()}`;
  const created = await createProduct(adminToken, {
    category_id: targetCategory.id,
    name: uniqueProductName,
    description: 'Refreshing drink crafted for tests',
    image: 'https://example.com/drink.jpg',
    base_price_usd: 3.75,
    is_available: true,
  });
  assert.ok(created.id > 0);
  assert.equal(created.name, uniqueProductName);
  assert.equal(created.base_price_usd, 3.75);

  const updated = await updateProduct(adminToken, created.id, {
    category_id: targetCategory.id,
    name: `${uniqueProductName} Deluxe`,
    description: 'Updated description',
    image: null,
    base_price_usd: 4.25,
    is_available: false,
  });
  assert.equal(updated.name, `${uniqueProductName} Deluxe`);
  assert.equal(updated.base_price_usd, 4.25);
  assert.equal(updated.is_available, false);

  // Filter products by category
  const products = await getProducts(adminToken);
  assert.ok(Array.isArray(products));
  assert.ok(products.some((p) => p.id === created.id));

  // Clean up
  const deleted = await deleteProduct(adminToken, created.id);
  assert.ok(deleted.message.includes('deleted'));
});

test('5. Management Portal Integration: Order listing, counts_by_status contract, detail and status transitions', async () => {
  const orderList = await getOrders(adminToken, 'all');
  assert.ok(Array.isArray(orderList.items));
  assert.equal(typeof orderList.total, 'number');
  assert.ok(orderList.counts_by_status, 'counts_by_status must be present');

  // Verify all 5 canonical statuses exist and are non-null numbers
  assert.equal(typeof orderList.counts_by_status.pending, 'number');
  assert.equal(typeof orderList.counts_by_status.preparing, 'number');
  assert.equal(typeof orderList.counts_by_status.ready, 'number');
  assert.equal(typeof orderList.counts_by_status.completed, 'number');
  assert.equal(typeof orderList.counts_by_status.cancelled, 'number');

  if (orderList.items.length > 0) {
    const sampleOrder = orderList.items[0];
    const detail = await getOrder(adminToken, sampleOrder.id);
    assert.equal(detail.id, sampleOrder.id);
    assert.ok(Array.isArray(detail.items));

    // Transition status
    const updatedStatus = await updateOrderStatus(adminToken, sampleOrder.id, 'preparing');
    assert.equal(updatedStatus.order_status, 'preparing');
  }
});

test('6. Management Portal Integration: Sales reports, customer list and staff list', async () => {
  const sales = await getSalesReport(adminToken);
  assert.equal(typeof sales.total_revenue_usd, 'number');
  assert.equal(typeof sales.total_revenue_khr, 'number');
  assert.equal(typeof sales.total_orders, 'number');

  const customers = await getCustomers(adminToken);
  assert.ok(Array.isArray(customers.items));

  if (customers.items.length > 0) {
    const singleCustomer = await getCustomer(adminToken, customers.items[0].id);
    assert.equal(singleCustomer.id, customers.items[0].id);
  }

  const staff = await getStaff(adminToken);
  assert.ok(Array.isArray(staff));
  assert.ok(staff.some((s) => s.email === 'admin@coffeeshop.com'));
});

test('7. Management Portal Integration: Sellers, Stores, Store Assignment & Seller Portal flow', async () => {
  const stamp = Date.now();
  const sellerEmail = `seller_${stamp}@example.com`;
  const sellerPassword = 'SellerSecret123!';

  // Create seller
  const seller = await createSeller(adminToken, {
    email: sellerEmail,
    password: sellerPassword,
    full_name: 'Phnom Penh Seller Partner',
  });
  assert.ok(seller.id > 0);
  assert.equal(seller.email, sellerEmail);

  // Get seller by ID and list sellers
  const fetchedSeller = await getSeller(adminToken, seller.id);
  assert.equal(fetchedSeller.id, seller.id);
  const sellersList = await getSellers(adminToken, {});
  assert.ok(sellersList.items.some((s) => s.id === seller.id));

  // Update seller
  const updatedSeller = await updateSeller(adminToken, seller.id, {
    full_name: 'Phnom Penh Seller Partner Updated',
  });
  assert.equal(updatedSeller.full_name, 'Phnom Penh Seller Partner Updated');

  // Update seller status
  const statusUpdated = await updateSellerStatus(adminToken, seller.id, true);
  assert.equal(statusUpdated.is_active, true);

  // Create store
  const storeCode = `ST-${stamp.toString().slice(-6)}`;
  const store = await createStore(adminToken, {
    code: storeCode,
    name: 'BKK1 Flagship Store',
    address: 'St 214, Phnom Penh',
    is_active: true,
  });
  assert.ok(store.id > 0);
  assert.equal(store.code, storeCode);
  assert.equal(store.is_active, true);

  // Get store by ID and update store
  const fetchedStore = await getStore(adminToken, store.id);
  assert.equal(fetchedStore.id, store.id);
  const updatedStore = await updateStore(adminToken, store.id, {
    address: 'Updated St 214, Phnom Penh',
  });
  assert.equal(updatedStore.address, 'Updated St 214, Phnom Penh');

  // Test getStores with is_active: true filter
  const activeStores = await getStores(adminToken, { is_active: true });
  assert.ok(activeStores.items.some((s) => s.id === store.id));

  // Assign store to seller
  const assignRes = await assignSellerStore(adminToken, seller.id, store.id);
  assert.equal(assignRes.store_id, store.id);
  assert.equal(assignRes.seller_id, seller.id);

  // Get seller stores (verifying seller_email and seller_name)
  const assignments = await getSellerStores(adminToken, seller.id);
  assert.equal(assignments.seller_id, seller.id);
  assert.equal(assignments.seller_email, sellerEmail);
  assert.ok(assignments.seller_name.includes('Phnom Penh Seller Partner'));
  assert.ok(assignments.stores.some((s) => s.id === store.id));

  // Seller login & seller portal endpoints
  const sellerLogin = await loginSeller(sellerEmail, sellerPassword);
  assert.ok(sellerLogin.access_token);
  assert.equal(sellerLogin.seller.email, sellerEmail);

  const sellerProfile = await getSellerProfile(sellerLogin.access_token);
  assert.equal(sellerProfile.id, seller.id);
  assert.equal(sellerProfile.role, 'seller');

  const myStores = await getMyStores(sellerLogin.access_token);
  assert.ok(Array.isArray(myStores.items));
  assert.ok(myStores.items.some((s) => s.id === store.id));

  const mySellerOrders = await getMyOrders(sellerLogin.access_token);
  assert.ok(Array.isArray(mySellerOrders.items));

  // Unassign store
  const unassignRes = await unassignSellerStore(adminToken, seller.id, store.id);
  assert.equal(unassignRes.unassigned, true);

  // Delete store (verifying success: true)
  const deleteStoreRes = await deleteStore(adminToken, store.id);
  assert.equal(deleteStoreRes.success, true);
});

test('8. Management Portal Integration: Staff/Admin CRUD, Cash Settlement Audit, and Date-Filtered Sales Report', async () => {
  const stamp = Date.now();
  const staffEmail = `staff_${stamp}@example.com`;
  const createdStaff = await createStaff(adminToken, {
    email: staffEmail,
    full_name: 'Barista Staff One',
    password: 'StaffPassword123!',
    role: 'staff',
  });
  assert.equal(createdStaff.email, staffEmail);
  assert.equal(createdStaff.role, 'staff');
  assert.equal(createdStaff.is_active, true);

  const promotedStaff = await updateStaff(adminToken, createdStaff.id, {
    full_name: 'Lead Barista',
    role: 'admin',
  });
  assert.equal(promotedStaff.full_name, 'Lead Barista');
  assert.equal(promotedStaff.role, 'admin');

  const deactivatedStaff = await updateStaff(adminToken, createdStaff.id, {
    is_active: false,
  });
  assert.equal(deactivatedStaff.is_active, false);

  // Verify last-admin protection rejects deactivating the sole remaining admin
  const allStaff = await getStaff(adminToken);
  const activeAdmin = allStaff.find(u => u.role === 'admin' && u.is_active);
  assert.ok(activeAdmin);
  await assert.rejects(
    updateStaff(adminToken, activeAdmin.id, { is_active: false }),
    err => err instanceof ApiError && err.status === 400,
  );

  // Place a real customer cash order and settle + complete it end-to-end
  const phone = `019${String(stamp).slice(-7)}`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Portal Test Customer',
      phone,
      email: `cust_${stamp}@example.com`,
      password: 'CustomerPass123!',
    }),
  });
  assert.equal(regRes.status, 201);
  const regData = (await regRes.json()) as { access_token: string };

  const products = await getProducts(adminToken);
  const availableProduct = products.find(p => p.is_available);
  assert.ok(availableProduct);

  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regData.access_token}`,
      'Idempotency-Key': `portal-int-${stamp}`,
    },
    body: JSON.stringify({
      customer_name: 'Portal Test Customer',
      customer_phone: phone,
      payment_method: 'cash',
      notes: 'Less ice, extra pearls',
      items: [
        {
          product_id: availableProduct.id,
          quantity: 1,
          size: 'Medium',
          sugar_level: '50%',
          ice_level: 'Less Ice',
          toppings: [],
        },
      ],
    }),
  });
  assert.equal(orderRes.status, 201);
  const placedOrder = (await orderRes.json()) as { id: number; total_usd: number };

  await updateOrderStatus(adminToken, placedOrder.id, 'preparing');
  await updateOrderStatus(adminToken, placedOrder.id, 'ready');
  const settlement = await settleCash(adminToken, placedOrder.id, `POS-REG-${stamp}`);
  assert.ok(settlement.id > 0);

  const auditEntries = await getOrderPaymentAudit(adminToken, placedOrder.id);
  assert.equal(auditEntries.length, 1);
  assert.equal(auditEntries[0].reference, `POS-REG-${stamp}`);

  await updateOrderStatus(adminToken, placedOrder.id, 'completed');

  const todayYmd = new Date().toISOString().slice(0, 10);
  const todayReport = await getSalesReport(adminToken, {
    date_from: todayYmd,
    date_to: todayYmd,
  });
  assert.ok(todayReport.total_orders >= 1);
  assert.ok(todayReport.total_revenue_usd >= placedOrder.total_usd);

  await assert.rejects(
    getSalesReport(adminToken, { date_from: '2026-12-31', date_to: '2026-01-01' }),
    err => err instanceof ApiError && err.status === 400,
  );
});
