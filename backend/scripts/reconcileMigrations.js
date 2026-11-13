import pg from 'pg';
import { migrationFiles } from './prepareMigrations.js';
import { verifyMigrations } from '../src/db/verifyMigrations.js';

export const AUTHORIZED_TARGETS = Object.freeze({
  projectId: 'spring-rain-57515077',
  stagingBranchId: 'br-silent-water-a1z4n5ct',
  stagingEndpointId: 'ep-restless-heart-a1opinu4',
  stagingDatabase: 'coffee_shop',
  productionBranchId: 'br-shy-sky-a14lgyqi',
  productionEndpointId: 'ep-tiny-poetry-a1tmuoa4',
});

/**
 * Fail-closed staging target verification for write mode.
 * Verifies connection against authoritative Neon session and endpoint data.
 * Rejects production branch and any unauthorized endpoints.
 */
export async function assertAuthorizedStagingTarget(
  client,
  connectionString = null,
  { allowDisposableTest = false } = {},
) {
  // 1. Connection string pre-check (if URL is provided)
  if (connectionString) {
    let parsedUrl;
    try {
      parsedUrl = new URL(connectionString);
    } catch {
      throw new Error('Target guard failed: Invalid database connection URL syntax.');
    }

    const host = parsedUrl.hostname.toLowerCase();
    if (
      host.includes(AUTHORIZED_TARGETS.productionEndpointId) ||
      host.includes(AUTHORIZED_TARGETS.productionBranchId)
    ) {
      throw new Error(
        'CRITICAL TARGET GUARD: Writes to production branch or endpoint are strictly prohibited.',
      );
    }
  }

  // 2. Authoritative PostgreSQL session query
  const sessionRes = await client.query(`
    SELECT
      current_database() AS current_db,
      current_setting('neon.branch_id', true) AS branch_id,
      current_setting('neon.endpoint_id', true) AS endpoint_id,
      current_setting('neon.project_id', true) AS project_id
  `);

  const { current_db, branch_id, endpoint_id } = sessionRes.rows[0];

  // 3. Absolute ban on production branch in active session
  if (
    branch_id === AUTHORIZED_TARGETS.productionBranchId ||
    endpoint_id === AUTHORIZED_TARGETS.productionEndpointId
  ) {
    throw new Error(
      'CRITICAL TARGET GUARD: Connected database session is identified as PRODUCTION. Aborting write operation.',
    );
  }

  // 4. Test mode handling for isolated disposable test databases
  if (allowDisposableTest) {
    // In explicit test mode, ensure it's not production
    return {
      authorized: true,
      mode: 'disposable_test',
      branch_id: branch_id || 'disposable',
      endpoint_id: endpoint_id || 'disposable',
      database: current_db,
    };
  }

  // 5. Strict staging verification
  if (branch_id !== AUTHORIZED_TARGETS.stagingBranchId) {
    throw new Error(
      `Target guard failed: Connected branch [${branch_id || 'unknown'}] does not match authorized staging branch [${AUTHORIZED_TARGETS.stagingBranchId}].`,
    );
  }

  if (endpoint_id !== AUTHORIZED_TARGETS.stagingEndpointId) {
    throw new Error(
      `Target guard failed: Connected endpoint [${endpoint_id || 'unknown'}] does not match authorized staging endpoint [${AUTHORIZED_TARGETS.stagingEndpointId}].`,
    );
  }

  if (current_db !== AUTHORIZED_TARGETS.stagingDatabase) {
    throw new Error(
      `Target guard failed: Connected database [${current_db}] does not match authorized database [${AUTHORIZED_TARGETS.stagingDatabase}].`,
    );
  }

  if (connectionString) {
    const parsedUrl = new URL(connectionString);
    if (!parsedUrl.hostname.includes(AUTHORIZED_TARGETS.stagingEndpointId)) {
      throw new Error(
        `Target guard failed: Connection host [${parsedUrl.hostname}] does not match staging endpoint.`,
      );
    }
  }

  return {
    authorized: true,
    mode: 'staging',
    branch_id,
    endpoint_id,
    database: current_db,
  };
}

/**
 * Comprehensive verification of migration effects for migrations 001 and 002.
 * Inspects:
 * - exact columns, data types, nullability, and defaults
 * - primary keys (including composite keys)
 * - foreign keys, referenced tables/columns, and ON DELETE actions
 * - unique constraints
 * - CHECK constraint expressions
 * - trigger functions and procedural language
 * - trigger events, timing, execution levels, and enabled status
 */
export async function verifySchemaMigrationEffects(client) {
  const reports = [];

  // =========================================================================
  // MIGRATION 001 VERIFICATION
  // =========================================================================

  // 1. Column orders.customer_id (integer, nullable)
  const orderColsRes = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name IN ('customer_id', 'payment_status')
  `);
  const orderCols = Object.fromEntries(orderColsRes.rows.map(r => [r.column_name, r]));

  if (!orderCols.customer_id || orderCols.customer_id.data_type !== 'integer') {
    throw new Error('Migration 001 effect missing: orders.customer_id (integer) does not exist.');
  }

  // 2. Column orders.payment_status default 'unpaid'
  if (
    !orderCols.payment_status ||
    !String(orderCols.payment_status.column_default).includes('unpaid')
  ) {
    throw new Error('Migration 001 effect missing: orders.payment_status default is not unpaid.');
  }

  // 3. Foreign key orders.customer_id -> customer_users(id) ON DELETE SET NULL
  const fkRes = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.table_schema = 'public'
  `);
  const fks = fkRes.rows;

  const orderCustomerFk = fks.find(
    f =>
      f.table_name === 'orders' &&
      f.column_name === 'customer_id' &&
      f.foreign_table_name === 'customer_users' &&
      f.foreign_column_name === 'id',
  );
  if (!orderCustomerFk || orderCustomerFk.delete_rule !== 'SET NULL') {
    throw new Error(
      'Migration 001 effect missing: orders.customer_id foreign key with ON DELETE SET NULL not found.',
    );
  }

  // 4. Table order_idempotency columns
  const idempColsRes = await client.query(`
    SELECT column_name, data_type, is_nullable, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_idempotency'
  `);
  if (idempColsRes.rowCount === 0) {
    throw new Error('Migration 001 effect missing: order_idempotency table does not exist.');
  }
  const idempCols = Object.fromEntries(idempColsRes.rows.map(r => [r.column_name, r]));

  if (
    !idempCols.customer_id ||
    idempCols.customer_id.data_type !== 'integer' ||
    idempCols.customer_id.is_nullable !== 'NO'
  ) {
    throw new Error(
      'Migration 001 effect missing: order_idempotency.customer_id (integer NOT NULL) missing.',
    );
  }
  if (
    !idempCols.idempotency_key ||
    idempCols.idempotency_key.data_type !== 'character varying' ||
    idempCols.idempotency_key.character_maximum_length !== 128
  ) {
    throw new Error(
      'Migration 001 effect missing: order_idempotency.idempotency_key (varchar(128) NOT NULL) missing.',
    );
  }
  if (
    !idempCols.request_hash ||
    idempCols.request_hash.data_type !== 'character' ||
    idempCols.request_hash.character_maximum_length !== 64
  ) {
    throw new Error(
      'Migration 001 effect missing: order_idempotency.request_hash (char(64) NOT NULL) missing.',
    );
  }
  if (!idempCols.order_id || idempCols.order_id.data_type !== 'integer') {
    throw new Error('Migration 001 effect missing: order_idempotency.order_id (integer) missing.');
  }
  if (!idempCols.created_at || idempCols.created_at.data_type !== 'timestamp with time zone') {
    throw new Error(
      'Migration 001 effect missing: order_idempotency.created_at (timestamptz) missing.',
    );
  }

  // 5. Composite Primary Key on order_idempotency (customer_id, idempotency_key)
  const pkRes = await client.query(`
    SELECT tc.table_name, kcu.column_name, kcu.ordinal_position
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY tc.table_name, kcu.ordinal_position
  `);
  const idempPkCols = pkRes.rows
    .filter(r => r.table_name === 'order_idempotency')
    .map(r => r.column_name);

  if (
    idempPkCols.length !== 2 ||
    idempPkCols[0] !== 'customer_id' ||
    idempPkCols[1] !== 'idempotency_key'
  ) {
    throw new Error(
      'Migration 001 effect missing: order_idempotency PRIMARY KEY (customer_id, idempotency_key) missing.',
    );
  }

  // 6. Unique constraint on order_idempotency.order_id
  const uniqueRes = await client.query(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'UNIQUE'
  `);
  const hasIdempUniqueOrder = uniqueRes.rows.some(
    r => r.table_name === 'order_idempotency' && r.column_name === 'order_id',
  );
  if (!hasIdempUniqueOrder) {
    throw new Error(
      'Migration 001 effect missing: order_idempotency UNIQUE constraint on order_id missing.',
    );
  }

  // 7. Foreign keys on order_idempotency with ON DELETE CASCADE
  const idempCustomerFk = fks.find(
    f =>
      f.table_name === 'order_idempotency' &&
      f.column_name === 'customer_id' &&
      f.foreign_table_name === 'customer_users' &&
      f.foreign_column_name === 'id',
  );
  if (!idempCustomerFk || idempCustomerFk.delete_rule !== 'CASCADE') {
    throw new Error(
      'Migration 001 effect missing: order_idempotency.customer_id FK with ON DELETE CASCADE missing.',
    );
  }

  const idempOrderFk = fks.find(
    f =>
      f.table_name === 'order_idempotency' &&
      f.column_name === 'order_id' &&
      f.foreign_table_name === 'orders' &&
      f.foreign_column_name === 'id',
  );
  if (!idempOrderFk || idempOrderFk.delete_rule !== 'CASCADE') {
    throw new Error(
      'Migration 001 effect missing: order_idempotency.order_id FK with ON DELETE CASCADE missing.',
    );
  }

  // 8. Indexes on orders: idx_orders_customer and idx_orders_ref
  const orderIdxRes = await client.query(`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'orders'
  `);
  const orderIndexNames = new Set(orderIdxRes.rows.map(r => r.indexname));
  if (!orderIndexNames.has('idx_orders_customer')) {
    throw new Error('Migration 001 effect missing: index idx_orders_customer on orders missing.');
  }
  if (!orderIndexNames.has('idx_orders_ref')) {
    throw new Error('Migration 001 effect missing: index idx_orders_ref on orders missing.');
  }
  reports.push({ version: '001', name: '001_order_idempotency_alignment.sql', verified: true });

  // =========================================================================
  // MIGRATION 002 VERIFICATION
  // =========================================================================

  // 1. Table payment_settlements columns
  const settleColsRes = await client.query(`
    SELECT column_name, data_type, is_nullable, character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_settlements'
  `);
  if (settleColsRes.rowCount === 0) {
    throw new Error('Migration 002 effect missing: payment_settlements table does not exist.');
  }
  const settleCols = Object.fromEntries(settleColsRes.rows.map(r => [r.column_name, r]));

  if (
    !settleCols.id ||
    settleCols.id.data_type !== 'bigint' ||
    settleCols.id.is_nullable !== 'NO'
  ) {
    throw new Error(
      'Migration 002 effect missing: payment_settlements.id (bigint NOT NULL) missing.',
    );
  }
  if (
    !settleCols.order_id ||
    settleCols.order_id.data_type !== 'integer' ||
    settleCols.order_id.is_nullable !== 'NO'
  ) {
    throw new Error(
      'Migration 002 effect missing: payment_settlements.order_id (integer NOT NULL) missing.',
    );
  }
  if (
    !settleCols.staff_id ||
    settleCols.staff_id.data_type !== 'integer' ||
    settleCols.staff_id.is_nullable !== 'NO'
  ) {
    throw new Error(
      'Migration 002 effect missing: payment_settlements.staff_id (integer NOT NULL) missing.',
    );
  }
  if (
    !settleCols.method ||
    settleCols.method.data_type !== 'text' ||
    settleCols.method.is_nullable !== 'NO'
  ) {
    throw new Error(
      'Migration 002 effect missing: payment_settlements.method (text NOT NULL) missing.',
    );
  }
  if (
    !settleCols.reference ||
    settleCols.reference.data_type !== 'character varying' ||
    settleCols.reference.character_maximum_length !== 160
  ) {
    throw new Error(
      'Migration 002 effect missing: payment_settlements.reference (varchar(160) NOT NULL) missing.',
    );
  }
  if (
    !settleCols.amount_usd ||
    settleCols.amount_usd.data_type !== 'numeric' ||
    settleCols.amount_usd.numeric_precision !== 10 ||
    settleCols.amount_usd.numeric_scale !== 2
  ) {
    throw new Error(
      'Migration 002 effect missing: payment_settlements.amount_usd (numeric(10,2) NOT NULL) missing.',
    );
  }
  if (!settleCols.recorded_at || settleCols.recorded_at.data_type !== 'timestamp with time zone') {
    throw new Error(
      'Migration 002 effect missing: payment_settlements.recorded_at (timestamptz) missing.',
    );
  }

  // 2. Primary key on payment_settlements (id)
  const settlePkCols = pkRes.rows
    .filter(r => r.table_name === 'payment_settlements')
    .map(r => r.column_name);
  if (settlePkCols.length !== 1 || settlePkCols[0] !== 'id') {
    throw new Error('Migration 002 effect missing: payment_settlements PRIMARY KEY (id) missing.');
  }

  // 3. Unique constraint on payment_settlements.order_id
  const hasSettleUniqueOrder = uniqueRes.rows.some(
    r => r.table_name === 'payment_settlements' && r.column_name === 'order_id',
  );
  if (!hasSettleUniqueOrder) {
    throw new Error(
      'Migration 002 effect missing: payment_settlements UNIQUE constraint on order_id missing.',
    );
  }

  // 4. Foreign keys on payment_settlements with ON DELETE RESTRICT
  const settleOrderFk = fks.find(
    f =>
      f.table_name === 'payment_settlements' &&
      f.column_name === 'order_id' &&
      f.foreign_table_name === 'orders' &&
      f.foreign_column_name === 'id',
  );
  if (!settleOrderFk || settleOrderFk.delete_rule !== 'RESTRICT') {
    throw new Error(
      'Migration 002 effect missing: payment_settlements.order_id FK with ON DELETE RESTRICT missing.',
    );
  }

  const settleStaffFk = fks.find(
    f =>
      f.table_name === 'payment_settlements' &&
      f.column_name === 'staff_id' &&
      f.foreign_table_name === 'staff_users' &&
      f.foreign_column_name === 'id',
  );
  if (!settleStaffFk || settleStaffFk.delete_rule !== 'RESTRICT') {
    throw new Error(
      'Migration 002 effect missing: payment_settlements.staff_id FK with ON DELETE RESTRICT missing.',
    );
  }

  // 5. CHECK constraints on payment_settlements
  const checkRes = await client.query(`
    SELECT
      tc.constraint_name,
      pg_get_constraintdef(c.oid) AS constraint_def
    FROM information_schema.table_constraints tc
    JOIN pg_constraint c ON c.conname = tc.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'payment_settlements' AND tc.constraint_type = 'CHECK'
  `);
  const checkDefs = checkRes.rows.map(r => r.constraint_def.toLowerCase());

  const hasMethodCheck = checkDefs.some(def => def.includes("method = 'cash'"));
  if (!hasMethodCheck) {
    throw new Error(
      "Migration 002 effect missing: payment_settlements CHECK constraint (method = 'cash') missing.",
    );
  }

  const hasRefCheck = checkDefs.some(
    def => def.includes('length(') && def.includes('reference') && def.includes('>= 3'),
  );
  if (!hasRefCheck) {
    throw new Error(
      'Migration 002 effect missing: payment_settlements CHECK constraint on reference length missing.',
    );
  }

  const hasAmountCheck = checkDefs.some(
    def => def.includes('amount_usd > 0') || def.includes('amount_usd > (0)'),
  );
  if (!hasAmountCheck) {
    throw new Error(
      'Migration 002 effect missing: payment_settlements CHECK constraint (amount_usd > 0) missing.',
    );
  }

  // 6. Trigger function reject_payment_audit_mutation()
  const procRes = await client.query(`
    SELECT p.proname, l.lanname
    FROM pg_proc p
    JOIN pg_language l ON p.prolang = l.oid
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'reject_payment_audit_mutation'
  `);
  if (procRes.rowCount === 0 || procRes.rows[0].lanname !== 'plpgsql') {
    throw new Error(
      'Migration 002 effect missing: function reject_payment_audit_mutation() in plpgsql missing.',
    );
  }

  // 7. Triggers: payment_audit_immutable and payment_audit_no_truncate
  const triggerRes = await client.query(`
    SELECT
      t.tgname,
      t.tgenabled,
      pg_get_triggerdef(t.oid) as trigger_def,
      p.proname as proc_name
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE tgrelid = 'payment_settlements'::regclass
      AND t.tgname IN ('payment_audit_immutable', 'payment_audit_no_truncate')
  `);
  const triggers = Object.fromEntries(triggerRes.rows.map(r => [r.tgname, r]));

  if (!triggers.payment_audit_immutable || triggers.payment_audit_immutable.tgenabled !== 'O') {
    throw new Error(
      'Migration 002 effect missing: trigger payment_audit_immutable missing or not enabled.',
    );
  }
  const immutDef = (triggers.payment_audit_immutable.trigger_def || '').toUpperCase();
  if (
    !immutDef.includes('BEFORE') ||
    (!immutDef.includes('DELETE OR UPDATE') && !immutDef.includes('UPDATE OR DELETE')) ||
    !immutDef.includes('FOR EACH ROW')
  ) {
    throw new Error(
      'Migration 002 effect missing: trigger payment_audit_immutable timing/event/level mismatch.',
    );
  }

  if (!triggers.payment_audit_no_truncate || triggers.payment_audit_no_truncate.tgenabled !== 'O') {
    throw new Error(
      'Migration 002 effect missing: trigger payment_audit_no_truncate missing or not enabled.',
    );
  }
  const noTruncDef = (triggers.payment_audit_no_truncate.trigger_def || '').toUpperCase();
  if (!noTruncDef.includes('BEFORE TRUNCATE') || !noTruncDef.includes('FOR EACH STATEMENT')) {
    throw new Error(
      'Migration 002 effect missing: trigger payment_audit_no_truncate timing/event/level mismatch.',
    );
  }

  reports.push({ version: '002', name: '002_cash_settlement.sql', verified: true });

  // =========================================================================
  // MIGRATION 003 VERIFICATION
  // =========================================================================

  // 1. Column orders.store_id (integer, nullable)
  const orderStoreColRes = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'store_id'
  `);
  if (orderStoreColRes.rowCount === 0 || orderStoreColRes.rows[0].data_type !== 'integer') {
    throw new Error('Migration 003 effect missing: orders.store_id (integer) missing.');
  }

  // 2. Table stores columns
  const storeColsRes = await client.query(`
    SELECT column_name, data_type, is_nullable, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stores'
  `);
  if (storeColsRes.rowCount === 0) {
    throw new Error('Migration 003 effect missing: stores table does not exist.');
  }
  const storeCols = Object.fromEntries(storeColsRes.rows.map(r => [r.column_name, r]));

  if (!storeCols.id || storeCols.id.data_type !== 'integer' || storeCols.id.is_nullable !== 'NO') {
    throw new Error('Migration 003 effect missing: stores.id (integer NOT NULL) missing.');
  }
  if (
    !storeCols.name ||
    storeCols.name.data_type !== 'character varying' ||
    storeCols.name.character_maximum_length !== 120
  ) {
    throw new Error('Migration 003 effect missing: stores.name (varchar(120) NOT NULL) missing.');
  }
  if (
    !storeCols.code ||
    storeCols.code.data_type !== 'character varying' ||
    storeCols.code.character_maximum_length !== 64
  ) {
    throw new Error('Migration 003 effect missing: stores.code (varchar(64) NOT NULL) missing.');
  }
  if (
    !storeCols.is_active ||
    storeCols.is_active.data_type !== 'boolean' ||
    storeCols.is_active.is_nullable !== 'NO'
  ) {
    throw new Error('Migration 003 effect missing: stores.is_active (boolean NOT NULL) missing.');
  }

  // 3. Table seller_store_assignments columns
  const assignColsRes = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_store_assignments'
  `);
  if (assignColsRes.rowCount === 0) {
    throw new Error('Migration 003 effect missing: seller_store_assignments table does not exist.');
  }
  const assignCols = Object.fromEntries(assignColsRes.rows.map(r => [r.column_name, r]));

  if (
    !assignCols.id ||
    assignCols.id.data_type !== 'integer' ||
    assignCols.id.is_nullable !== 'NO'
  ) {
    throw new Error(
      'Migration 003 effect missing: seller_store_assignments.id (integer NOT NULL) missing.',
    );
  }
  if (
    !assignCols.seller_id ||
    assignCols.seller_id.data_type !== 'integer' ||
    assignCols.seller_id.is_nullable !== 'NO'
  ) {
    throw new Error(
      'Migration 003 effect missing: seller_store_assignments.seller_id (integer NOT NULL) missing.',
    );
  }
  if (
    !assignCols.store_id ||
    assignCols.store_id.data_type !== 'integer' ||
    assignCols.store_id.is_nullable !== 'NO'
  ) {
    throw new Error(
      'Migration 003 effect missing: seller_store_assignments.store_id (integer NOT NULL) missing.',
    );
  }

  // 4. Primary keys
  const storePk = pkRes.rows.find(r => r.table_name === 'stores' && r.column_name === 'id');
  if (!storePk) {
    throw new Error('Migration 003 effect missing: stores PRIMARY KEY (id) missing.');
  }
  const assignPk = pkRes.rows.find(
    r => r.table_name === 'seller_store_assignments' && r.column_name === 'id',
  );
  if (!assignPk) {
    throw new Error(
      'Migration 003 effect missing: seller_store_assignments PRIMARY KEY (id) missing.',
    );
  }

  // 5. Foreign keys
  const orderStoreFk = fks.find(
    f =>
      f.table_name === 'orders' &&
      f.column_name === 'store_id' &&
      f.foreign_table_name === 'stores' &&
      f.foreign_column_name === 'id',
  );
  if (!orderStoreFk || orderStoreFk.delete_rule !== 'RESTRICT') {
    throw new Error(
      'Migration 003 effect missing: orders.store_id FK with ON DELETE RESTRICT missing.',
    );
  }

  const assignSellerFk = fks.find(
    f =>
      f.table_name === 'seller_store_assignments' &&
      f.column_name === 'seller_id' &&
      f.foreign_table_name === 'staff_users' &&
      f.foreign_column_name === 'id',
  );
  if (!assignSellerFk || assignSellerFk.delete_rule !== 'CASCADE') {
    throw new Error(
      'Migration 003 effect missing: seller_store_assignments.seller_id FK with ON DELETE CASCADE missing.',
    );
  }

  const assignStoreFk = fks.find(
    f =>
      f.table_name === 'seller_store_assignments' &&
      f.column_name === 'store_id' &&
      f.foreign_table_name === 'stores' &&
      f.foreign_column_name === 'id',
  );
  if (!assignStoreFk || assignStoreFk.delete_rule !== 'CASCADE') {
    throw new Error(
      'Migration 003 effect missing: seller_store_assignments.store_id FK with ON DELETE CASCADE missing.',
    );
  }

  // 6. Unique constraints
  const hasStoreCodeUnique = uniqueRes.rows.some(
    r => r.table_name === 'stores' && r.column_name === 'code',
  );
  if (!hasStoreCodeUnique) {
    throw new Error('Migration 003 effect missing: stores UNIQUE constraint on code missing.');
  }

  // 7. Indexes
  const allIdxRes = await client.query(`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
  `);
  const allIndexNames = new Set(allIdxRes.rows.map(r => r.indexname));
  if (!allIndexNames.has('idx_orders_store')) {
    throw new Error('Migration 003 effect missing: index idx_orders_store on orders missing.');
  }
  if (!allIndexNames.has('idx_seller_assignments_seller')) {
    throw new Error(
      'Migration 003 effect missing: index idx_seller_assignments_seller on seller_store_assignments missing.',
    );
  }
  if (!allIndexNames.has('idx_seller_assignments_store')) {
    throw new Error(
      'Migration 003 effect missing: index idx_seller_assignments_store on seller_store_assignments missing.',
    );
  }

  reports.push({ version: '003', name: '003_stores_and_assignments.sql', verified: true });
  return reports;
}

/**
 * Reconcile migration tracking for manually applied migrations.
 *
 * DRY-RUN (execute=false, default):
 * - Pure read-only inspection.
 * - Validates schema migration effects and checksums.
 * - Reports planned actions without modifying any data or acquiring exclusive locks.
 *
 * EXECUTE (execute=true):
 * - Fails closed unless target is authorized staging.
 * - Never allows writes to production branch.
 * - Performs schema verification, lock acquisition, table creation, and tracking record
 *   insertion all inside a single transaction protected by an advisory lock.
 * - Safely rolls back on any error.
 */
export async function reconcileMigrations(
  client,
  { execute = false, allowDisposableTest = false, connectionString = null } = {},
) {
  const files = await migrationFiles();

  // In dry-run mode (default), perform read-only inspection
  if (!execute) {
    const verifiedEffects = await verifySchemaMigrationEffects(client);

    for (const file of files) {
      const verified = verifiedEffects.find(v => v.version === file.version);
      if (!verified) {
        throw new Error(
          `Migration ${file.version} (${file.name}) does not have verified schema effects.`,
        );
      }
    }

    const regclassRes = await client.query(
      "SELECT to_regclass('public.schema_migrations') as regclass",
    );
    const trackingTableExists = Boolean(regclassRes.rows[0].regclass);

    let existingRows = [];
    if (trackingTableExists) {
      const existingRes = await client.query(
        'SELECT version, name, checksum FROM schema_migrations',
      );
      existingRows = existingRes.rows;
    }

    const actions = files.map(file => {
      const existing = existingRows.find(r => r.version === file.version);
      if (!existing) {
        return {
          version: file.version,
          name: file.name,
          checksum: file.checksum,
          action: 'insert',
        };
      }
      if (existing.checksum !== file.checksum || existing.name !== file.name) {
        throw new Error(`Migration ${file.version} checksum mismatch in existing tracking table.`);
      }
      return { version: file.version, name: file.name, checksum: file.checksum, action: 'keep' };
    });

    return {
      dryRun: true,
      trackingTableExists,
      verifiedMigrations: verifiedEffects.map(v => v.version),
      actions,
    };
  }

  // =========================================================================
  // WRITE MODE (execute = true)
  // =========================================================================

  // Step 1: Pre-flight fail-closed target guard BEFORE opening transaction
  const targetInfo = await assertAuthorizedStagingTarget(client, connectionString, {
    allowDisposableTest,
  });

  // Step 2: Open transaction and acquire advisory lock
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(85105002)');

    // Step 3: Verify migration effects inside the locked transaction
    const verifiedEffects = await verifySchemaMigrationEffects(client);
    for (const file of files) {
      const verified = verifiedEffects.find(v => v.version === file.version);
      if (!verified) {
        throw new Error(
          `Migration ${file.version} (${file.name}) does not have verified schema effects.`,
        );
      }
    }

    // Step 4: Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(3) PRIMARY KEY,
        name TEXT NOT NULL,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Step 5: Read existing rows and calculate actions inside transaction
    const existingRes = await client.query('SELECT version, name, checksum FROM schema_migrations');
    const existingRows = existingRes.rows;

    const actions = files.map(file => {
      const existing = existingRows.find(r => r.version === file.version);
      if (!existing) {
        return {
          version: file.version,
          name: file.name,
          checksum: file.checksum,
          action: 'insert',
        };
      }
      if (existing.checksum !== file.checksum || existing.name !== file.name) {
        throw new Error(`Migration ${file.version} checksum mismatch in existing tracking table.`);
      }
      return { version: file.version, name: file.name, checksum: file.checksum, action: 'keep' };
    });

    // Step 6: Insert missing tracking records
    for (const item of actions) {
      if (item.action === 'insert') {
        await client.query(
          'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
          [item.version, item.name, item.checksum],
        );
      }
    }

    // Step 7: Verify migrations with verifyMigrations inside transaction
    await verifyMigrations(client);

    // Step 8: Commit transaction
    await client.query('COMMIT');

    return {
      dryRun: false,
      reconciled: true,
      target: targetInfo,
      reconciledCount: actions.filter(a => a.action === 'insert').length,
      actions,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

if (process.argv[1] && process.argv[1].endsWith('reconcileMigrations.js')) {
  const executeFlag = process.argv.includes('--execute');
  const allowDisposableFlag = process.argv.includes('--allow-disposable-test');
  const connectionString = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Error: DATABASE_URL or MIGRATION_DATABASE_URL is required.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  client
    .connect()
    .then(async () => {
      console.log(
        `Connected to database. Mode: ${executeFlag ? 'EXECUTE (WRITE)' : 'DRY-RUN (READ-ONLY)'}`,
      );
      const result = await reconcileMigrations(client, {
        execute: executeFlag,
        allowDisposableTest: allowDisposableFlag,
        connectionString,
      });
      console.log('Reconciliation result:', JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error('Reconciliation failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => client.end());
}
