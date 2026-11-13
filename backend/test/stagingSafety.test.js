import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateProductionConfig,
  isProductionOrStaging,
  developmentCredentialDefaults,
} from '../src/config.js';
import { initSchema, buildPoolConfig } from '../src/db/database.js';
import { seedDatabase } from '../src/db/seed.js';
import { verifyMigrations } from '../src/db/verifyMigrations.js';
import {
  verifySchemaMigrationEffects,
  reconcileMigrations,
  assertAuthorizedStagingTarget,
  AUTHORIZED_TARGETS,
} from '../scripts/reconcileMigrations.js';

function validStagingEnv(overrides = {}) {
  return {
    NODE_ENV: 'staging',
    ENVIRONMENT: 'staging',
    DATABASE_URL:
      'postgresql://coffee_shop_owner:secure_pass_123@ep-cool-fog-123456.aws.neon.tech/coffee_shop?sslmode=require',
    JWT_SECRET: 'm7Qp4Vn8Rk2Ty6Wb9Hs3Ld5Fx7Zj1Ca0!',
    ADMIN_INITIAL_EMAIL: 'staging-operator@example.test',
    ADMIN_INITIAL_PASSWORD: 'OnlyForStagingStartup42!',
    CORS_ORIGINS: 'https://staging.example.test',
    ...overrides,
  };
}

function createMockValidSchemaDb(overrides = {}) {
  const queries = [];
  const db = {
    queries,
    query: async (sql, params = []) => {
      queries.push({ sql: sql.trim(), params });
      for (const key of Object.keys(overrides)) {
        if (sql.includes(key)) {
          const val = overrides[key];
          return typeof val === 'function' ? val(params, sql) : val;
        }
      }

      // Default responses for complete, valid schema:
      if (sql.includes('current_database()')) {
        return {
          rows: [
            {
              current_db: 'coffee_shop',
              branch_id: AUTHORIZED_TARGETS.stagingBranchId,
              endpoint_id: AUTHORIZED_TARGETS.stagingEndpointId,
              project_id: AUTHORIZED_TARGETS.projectId,
            },
          ],
        };
      }
      if (sql.includes('information_schema.columns') && sql.includes("table_name = 'orders'")) {
        return {
          rows: [
            {
              column_name: 'customer_id',
              data_type: 'integer',
              is_nullable: 'YES',
              column_default: null,
            },
            {
              column_name: 'payment_status',
              data_type: 'character varying',
              is_nullable: 'NO',
              column_default: "'unpaid'::character varying",
            },
            {
              column_name: 'store_id',
              data_type: 'integer',
              is_nullable: 'YES',
              column_default: null,
            },
          ],
        };
      }
      if (sql.includes('information_schema.columns') && sql.includes("table_name = 'stores'")) {
        return {
          rows: [
            {
              column_name: 'id',
              data_type: 'integer',
              is_nullable: 'NO',
              character_maximum_length: null,
            },
            {
              column_name: 'name',
              data_type: 'character varying',
              is_nullable: 'NO',
              character_maximum_length: 120,
            },
            {
              column_name: 'code',
              data_type: 'character varying',
              is_nullable: 'NO',
              character_maximum_length: 64,
            },
            {
              column_name: 'address',
              data_type: 'text',
              is_nullable: 'YES',
              character_maximum_length: null,
            },
            {
              column_name: 'is_active',
              data_type: 'boolean',
              is_nullable: 'NO',
              character_maximum_length: null,
            },
            {
              column_name: 'created_at',
              data_type: 'timestamp with time zone',
              is_nullable: 'NO',
              character_maximum_length: null,
            },
          ],
          rowCount: 6,
        };
      }
      if (
        sql.includes('information_schema.columns') &&
        sql.includes("table_name = 'seller_store_assignments'")
      ) {
        return {
          rows: [
            {
              column_name: 'id',
              data_type: 'integer',
              is_nullable: 'NO',
              character_maximum_length: null,
            },
            {
              column_name: 'seller_id',
              data_type: 'integer',
              is_nullable: 'NO',
              character_maximum_length: null,
            },
            {
              column_name: 'store_id',
              data_type: 'integer',
              is_nullable: 'NO',
              character_maximum_length: null,
            },
            {
              column_name: 'created_at',
              data_type: 'timestamp with time zone',
              is_nullable: 'NO',
              character_maximum_length: null,
            },
          ],
          rowCount: 4,
        };
      }
      if (
        sql.includes('information_schema.columns') &&
        sql.includes("table_name = 'order_idempotency'")
      ) {
        return {
          rows: [
            {
              column_name: 'customer_id',
              data_type: 'integer',
              is_nullable: 'NO',
              character_maximum_length: null,
            },
            {
              column_name: 'idempotency_key',
              data_type: 'character varying',
              is_nullable: 'NO',
              character_maximum_length: 128,
            },
            {
              column_name: 'request_hash',
              data_type: 'character',
              is_nullable: 'NO',
              character_maximum_length: 64,
            },
            {
              column_name: 'order_id',
              data_type: 'integer',
              is_nullable: 'YES',
              character_maximum_length: null,
            },
            {
              column_name: 'created_at',
              data_type: 'timestamp with time zone',
              is_nullable: 'NO',
              character_maximum_length: null,
            },
          ],
          rowCount: 5,
        };
      }
      if (
        sql.includes('information_schema.columns') &&
        sql.includes("table_name = 'payment_settlements'")
      ) {
        return {
          rows: [
            {
              column_name: 'id',
              data_type: 'bigint',
              is_nullable: 'NO',
              character_maximum_length: null,
              numeric_precision: 64,
              numeric_scale: 0,
            },
            {
              column_name: 'order_id',
              data_type: 'integer',
              is_nullable: 'NO',
              character_maximum_length: null,
              numeric_precision: 32,
              numeric_scale: 0,
            },
            {
              column_name: 'staff_id',
              data_type: 'integer',
              is_nullable: 'NO',
              character_maximum_length: null,
              numeric_precision: 32,
              numeric_scale: 0,
            },
            {
              column_name: 'method',
              data_type: 'text',
              is_nullable: 'NO',
              character_maximum_length: null,
              numeric_precision: null,
              numeric_scale: null,
            },
            {
              column_name: 'reference',
              data_type: 'character varying',
              is_nullable: 'NO',
              character_maximum_length: 160,
              numeric_precision: null,
              numeric_scale: null,
            },
            {
              column_name: 'amount_usd',
              data_type: 'numeric',
              is_nullable: 'NO',
              character_maximum_length: null,
              numeric_precision: 10,
              numeric_scale: 2,
            },
            {
              column_name: 'recorded_at',
              data_type: 'timestamp with time zone',
              is_nullable: 'NO',
              character_maximum_length: null,
              numeric_precision: null,
              numeric_scale: null,
            },
          ],
          rowCount: 7,
        };
      }
      if (sql.includes('referential_constraints')) {
        return {
          rows: [
            {
              table_name: 'orders',
              column_name: 'customer_id',
              foreign_table_name: 'customer_users',
              foreign_column_name: 'id',
              delete_rule: 'SET NULL',
            },
            {
              table_name: 'orders',
              column_name: 'store_id',
              foreign_table_name: 'stores',
              foreign_column_name: 'id',
              delete_rule: 'RESTRICT',
            },
            {
              table_name: 'order_idempotency',
              column_name: 'customer_id',
              foreign_table_name: 'customer_users',
              foreign_column_name: 'id',
              delete_rule: 'CASCADE',
            },
            {
              table_name: 'order_idempotency',
              column_name: 'order_id',
              foreign_table_name: 'orders',
              foreign_column_name: 'id',
              delete_rule: 'CASCADE',
            },
            {
              table_name: 'payment_settlements',
              column_name: 'order_id',
              foreign_table_name: 'orders',
              foreign_column_name: 'id',
              delete_rule: 'RESTRICT',
            },
            {
              table_name: 'payment_settlements',
              column_name: 'staff_id',
              foreign_table_name: 'staff_users',
              foreign_column_name: 'id',
              delete_rule: 'RESTRICT',
            },
            {
              table_name: 'seller_store_assignments',
              column_name: 'seller_id',
              foreign_table_name: 'staff_users',
              foreign_column_name: 'id',
              delete_rule: 'CASCADE',
            },
            {
              table_name: 'seller_store_assignments',
              column_name: 'store_id',
              foreign_table_name: 'stores',
              foreign_column_name: 'id',
              delete_rule: 'CASCADE',
            },
          ],
        };
      }
      if (sql.includes("tc.constraint_type = 'PRIMARY KEY'")) {
        return {
          rows: [
            { table_name: 'order_idempotency', column_name: 'customer_id', ordinal_position: 1 },
            {
              table_name: 'order_idempotency',
              column_name: 'idempotency_key',
              ordinal_position: 2,
            },
            { table_name: 'payment_settlements', column_name: 'id', ordinal_position: 1 },
            { table_name: 'stores', column_name: 'id', ordinal_position: 1 },
            { table_name: 'seller_store_assignments', column_name: 'id', ordinal_position: 1 },
          ],
        };
      }
      if (sql.includes("tc.constraint_type = 'UNIQUE'")) {
        return {
          rows: [
            { table_name: 'order_idempotency', column_name: 'order_id' },
            { table_name: 'payment_settlements', column_name: 'order_id' },
            { table_name: 'stores', column_name: 'code' },
            { table_name: 'seller_store_assignments', column_name: 'seller_id' },
          ],
        };
      }
      if (sql.includes("tc.constraint_type = 'CHECK'")) {
        return {
          rows: [
            {
              constraint_name: 'payment_settlements_method_check',
              constraint_def: "CHECK ((method = 'cash'::text))",
            },
            {
              constraint_name: 'payment_settlements_reference_check',
              constraint_def: 'CHECK ((length(TRIM(BOTH FROM reference)) >= 3))',
            },
            {
              constraint_name: 'payment_settlements_amount_usd_check',
              constraint_def: 'CHECK ((amount_usd > (0)::numeric))',
            },
          ],
        };
      }
      if (sql.includes('FROM pg_proc')) {
        return {
          rows: [{ proname: 'reject_payment_audit_mutation', lanname: 'plpgsql' }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM pg_trigger')) {
        return {
          rows: [
            {
              tgname: 'payment_audit_immutable',
              tgenabled: 'O',
              trigger_def:
                'CREATE TRIGGER payment_audit_immutable BEFORE DELETE OR UPDATE ON public.payment_settlements FOR EACH ROW EXECUTE FUNCTION reject_payment_audit_mutation()',
              proc_name: 'reject_payment_audit_mutation',
            },
            {
              tgname: 'payment_audit_no_truncate',
              tgenabled: 'O',
              trigger_def:
                'CREATE TRIGGER payment_audit_no_truncate BEFORE TRUNCATE ON public.payment_settlements FOR EACH STATEMENT EXECUTE FUNCTION reject_payment_audit_mutation()',
              proc_name: 'reject_payment_audit_mutation',
            },
          ],
          rowCount: 2,
        };
      }
      if (sql.includes('pg_indexes')) {
        return {
          rows: [
            { indexname: 'idx_orders_customer' },
            { indexname: 'idx_orders_ref' },
            { indexname: 'idx_orders_store' },
            { indexname: 'idx_seller_assignments_seller' },
            { indexname: 'idx_seller_assignments_store' },
          ],
        };
      }
      if (sql.includes('to_regclass')) {
        return { rows: [{ regclass: null }] };
      }
      if (sql.includes('FROM schema_migrations')) {
        return {
          rows: [
            {
              version: '001',
              name: '001_order_idempotency_alignment.sql',
              checksum: 'f2e7763c1e0559bfebb21f4a7b5c58d63370ffaf52099de19f4293539fb08f72',
            },
            {
              version: '002',
              name: '002_cash_settlement.sql',
              checksum: '42cd04cfb7dd91dca4e8704bce918fa492ea15df93d4bbdc0746ee292627fdfb',
            },
            {
              version: '003',
              name: '003_stores_and_assignments.sql',
              checksum: 'ca18f25afd1260d70d61fb193afeb12a37a6236d25d5fb2a49a510ef3fb32884',
            },
          ],
          rowCount: 3,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  };
  return db;
}

test('isProductionOrStaging detects both production and staging environments', () => {
  assert.equal(isProductionOrStaging({ NODE_ENV: 'staging' }), true);
  assert.equal(isProductionOrStaging({ ENVIRONMENT: 'staging' }), true);
  assert.equal(isProductionOrStaging({ NODE_ENV: 'production' }), true);
  assert.equal(isProductionOrStaging({ ENVIRONMENT: 'production' }), true);
  assert.equal(
    isProductionOrStaging({ NODE_ENV: 'development', ENVIRONMENT: 'development' }),
    false,
  );
});

test('staging startup refuses missing required configuration', () => {
  assert.throws(
    () => validateProductionConfig({ NODE_ENV: 'staging' }),
    /DATABASE_URL is required/,
  );
  assert.throws(
    () => validateProductionConfig(validStagingEnv({ DATABASE_URL: '' })),
    /DATABASE_URL is required/,
  );
  assert.throws(
    () => validateProductionConfig(validStagingEnv({ JWT_SECRET: '' })),
    /JWT_SECRET is required/,
  );
  assert.throws(
    () => validateProductionConfig(validStagingEnv({ CORS_ORIGINS: '' })),
    /CORS_ORIGINS is required/,
  );
});

test('staging startup rejects wildcard CORS and development credentials', () => {
  assert.throws(
    () => validateProductionConfig(validStagingEnv({ CORS_ORIGINS: '*' })),
    /CORS_ORIGINS must not contain a wildcard/,
  );
  assert.throws(
    () =>
      validateProductionConfig(
        validStagingEnv({ JWT_SECRET: developmentCredentialDefaults.jwtSecret }),
      ),
    /JWT_SECRET must be a unique secret/,
  );
  assert.throws(
    () =>
      validateProductionConfig(
        validStagingEnv({
          ADMIN_INITIAL_PASSWORD: developmentCredentialDefaults.adminInitialPassword,
        }),
      ),
    /ADMIN_INITIAL_PASSWORD/,
  );
});

test('valid explicit staging configuration passes validation', () => {
  assert.doesNotThrow(() => validateProductionConfig(validStagingEnv()));
});

test('staging and production startup prohibit automatic data seeding', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnv = process.env.ENVIRONMENT;

  try {
    process.env.NODE_ENV = 'staging';
    process.env.ENVIRONMENT = 'staging';
    await assert.rejects(
      seedDatabase(),
      /Automatic database seeding is prohibited in staging and production/,
    );

    process.env.NODE_ENV = 'production';
    process.env.ENVIRONMENT = 'production';
    await assert.rejects(
      seedDatabase(),
      /Automatic database seeding is prohibited in staging and production/,
    );
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ENVIRONMENT = originalEnv;
  }
});

test('staging and production prohibit automatic table creation (initSchema)', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnv = process.env.ENVIRONMENT;

  try {
    process.env.NODE_ENV = 'staging';
    process.env.ENVIRONMENT = 'staging';
    await assert.rejects(
      initSchema({}),
      /Automatic schema modification is prohibited in staging and production/,
    );

    process.env.NODE_ENV = 'production';
    process.env.ENVIRONMENT = 'production';
    await assert.rejects(
      initSchema({}),
      /Automatic schema modification is prohibited in staging and production/,
    );
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ENVIRONMENT = originalEnv;
  }
});

test('migration verification rejects missing schema_migrations table with sanitized error', async () => {
  const mockDb = {
    query: async sql => {
      if (sql.includes('FROM schema_migrations')) {
        const error = new Error('relation "schema_migrations" does not exist');
        error.code = '42P01';
        throw error;
      }
      return { rows: [], rowCount: 0 };
    },
  };
  await assert.rejects(
    verifyMigrations(mockDb),
    /Database migration tracking table \(schema_migrations\) does not exist/,
  );
});

test('migration verification rejects missing migration records', async () => {
  const mockDb = {
    query: async sql => {
      if (sql.includes('FROM schema_migrations')) {
        return {
          rows: [
            {
              version: '001',
              name: '001_order_idempotency_alignment.sql',
              checksum: 'f2e7763c1e0559bfebb21f4a7b5c58d63370ffaf52099de19f4293539fb08f72',
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [{ 1: 1 }], rowCount: 2 };
    },
  };
  await assert.rejects(verifyMigrations(mockDb), /Database migrations are missing or have changed/);
});

test('migration verification rejects missing or disabled payment audit triggers', async () => {
  const mockDb = {
    query: async sql => {
      if (sql.includes('FROM schema_migrations')) {
        return {
          rows: [
            {
              version: '001',
              name: '001_order_idempotency_alignment.sql',
              checksum: 'f2e7763c1e0559bfebb21f4a7b5c58d63370ffaf52099de19f4293539fb08f72',
            },
            {
              version: '002',
              name: '002_cash_settlement.sql',
              checksum: '42cd04cfb7dd91dca4e8704bce918fa492ea15df93d4bbdc0746ee292627fdfb',
            },
            {
              version: '003',
              name: '003_stores_and_assignments.sql',
              checksum: 'ca18f25afd1260d70d61fb193afeb12a37a6236d25d5fb2a49a510ef3fb32884',
            },
          ],
          rowCount: 3,
        };
      }
      if (sql.includes('FROM pg_trigger')) {
        return { rows: [{ 1: 1 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
  await assert.rejects(verifyMigrations(mockDb), /Payment audit protection is missing or disabled/);
});

test('buildPoolConfig sets appropriate pool sizing, timeouts, and enforces TLS verification', () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'staging';

    const remoteUrl = 'postgresql://user:pass@ep-cool-fog-123456.aws.neon.tech/coffee_shop';
    const config = buildPoolConfig(remoteUrl);
    assert.equal(config.ssl?.rejectUnauthorized, true);
    assert.ok(config.connectionTimeoutMillis >= 2500);
    assert.ok(config.idleTimeoutMillis >= 10000);
    assert.ok(config.max >= 5);

    const insecureConfig = { ...config, ssl: { rejectUnauthorized: false } };
    if (
      insecureConfig.ssl &&
      typeof insecureConfig.ssl === 'object' &&
      insecureConfig.ssl.rejectUnauthorized === false
    ) {
      insecureConfig.ssl.rejectUnauthorized = true;
    }
    assert.equal(insecureConfig.ssl.rejectUnauthorized, true);
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

// ===========================================================================
// TARGET GUARD TESTS
// ===========================================================================

test('assertAuthorizedStagingTarget rejects production branch in connection string URL', async () => {
  const prodUrl = `postgresql://owner:secret@${AUTHORIZED_TARGETS.productionEndpointId}.aws.neon.tech/coffee_shop`;
  const mockDb = createMockValidSchemaDb();

  await assert.rejects(
    assertAuthorizedStagingTarget(mockDb, prodUrl),
    /CRITICAL TARGET GUARD: Writes to production branch or endpoint are strictly prohibited/,
  );
});

test('assertAuthorizedStagingTarget rejects production branch detected in active session', async () => {
  const mockDb = createMockValidSchemaDb({
    'current_database()': {
      rows: [
        {
          current_db: 'coffee_shop',
          branch_id: AUTHORIZED_TARGETS.productionBranchId,
          endpoint_id: AUTHORIZED_TARGETS.productionEndpointId,
          project_id: AUTHORIZED_TARGETS.projectId,
        },
      ],
    },
  });

  await assert.rejects(
    assertAuthorizedStagingTarget(
      mockDb,
      'postgresql://owner:secret@some-endpoint.aws.neon.tech/coffee_shop',
    ),
    /CRITICAL TARGET GUARD: Connected database session is identified as PRODUCTION/,
  );
});

test('assertAuthorizedStagingTarget rejects unauthorized branch, endpoint, or database name', async () => {
  // Wrong branch ID
  const wrongBranchDb = createMockValidSchemaDb({
    'current_database()': {
      rows: [
        {
          current_db: 'coffee_shop',
          branch_id: 'br-unauthorized-random',
          endpoint_id: AUTHORIZED_TARGETS.stagingEndpointId,
        },
      ],
    },
  });
  await assert.rejects(
    assertAuthorizedStagingTarget(wrongBranchDb, null, { allowDisposableTest: false }),
    /does not match authorized staging branch/,
  );

  // Wrong endpoint ID
  const wrongEndpointDb = createMockValidSchemaDb({
    'current_database()': {
      rows: [
        {
          current_db: 'coffee_shop',
          branch_id: AUTHORIZED_TARGETS.stagingBranchId,
          endpoint_id: 'ep-unauthorized-random',
        },
      ],
    },
  });
  await assert.rejects(
    assertAuthorizedStagingTarget(wrongEndpointDb, null, { allowDisposableTest: false }),
    /does not match authorized staging endpoint/,
  );

  // Wrong database name
  const wrongDbName = createMockValidSchemaDb({
    'current_database()': {
      rows: [
        {
          current_db: 'wrong_database_name',
          branch_id: AUTHORIZED_TARGETS.stagingBranchId,
          endpoint_id: AUTHORIZED_TARGETS.stagingEndpointId,
        },
      ],
    },
  });
  await assert.rejects(
    assertAuthorizedStagingTarget(wrongDbName, null, { allowDisposableTest: false }),
    /does not match authorized database/,
  );
});

// ===========================================================================
// STRENGTHENED SCHEMA VERIFICATION TESTS
// ===========================================================================

test('verifySchemaMigrationEffects accepts complete, valid schema', async () => {
  const mockDb = createMockValidSchemaDb();
  const reports = await verifySchemaMigrationEffects(mockDb);
  assert.equal(reports.length, 3);
  assert.equal(reports[0].version, '001');
  assert.equal(reports[1].version, '002');
  assert.equal(reports[2].version, '003');
});

test('verifySchemaMigrationEffects rejects missing composite primary key on order_idempotency', async () => {
  const mockDb = createMockValidSchemaDb({
    "tc.constraint_type = 'PRIMARY KEY'": {
      rows: [
        // Missing idempotency_key in PK
        { table_name: 'order_idempotency', column_name: 'customer_id', ordinal_position: 1 },
        { table_name: 'payment_settlements', column_name: 'id', ordinal_position: 1 },
      ],
    },
  });
  await assert.rejects(
    verifySchemaMigrationEffects(mockDb),
    /order_idempotency PRIMARY KEY \(customer_id, idempotency_key\) missing/,
  );
});

test('verifySchemaMigrationEffects rejects incorrect foreign key delete action', async () => {
  const mockDb = createMockValidSchemaDb({
    referential_constraints: {
      rows: [
        {
          table_name: 'orders',
          column_name: 'customer_id',
          foreign_table_name: 'customer_users',
          foreign_column_name: 'id',
          delete_rule: 'SET NULL',
        },
        // Incorrect delete_rule: SET NULL instead of CASCADE
        {
          table_name: 'order_idempotency',
          column_name: 'customer_id',
          foreign_table_name: 'customer_users',
          foreign_column_name: 'id',
          delete_rule: 'SET NULL',
        },
        {
          table_name: 'order_idempotency',
          column_name: 'order_id',
          foreign_table_name: 'orders',
          foreign_column_name: 'id',
          delete_rule: 'CASCADE',
        },
        {
          table_name: 'payment_settlements',
          column_name: 'order_id',
          foreign_table_name: 'orders',
          foreign_column_name: 'id',
          delete_rule: 'RESTRICT',
        },
        {
          table_name: 'payment_settlements',
          column_name: 'staff_id',
          foreign_table_name: 'staff_users',
          foreign_column_name: 'id',
          delete_rule: 'RESTRICT',
        },
      ],
    },
  });
  await assert.rejects(
    verifySchemaMigrationEffects(mockDb),
    /order_idempotency.customer_id FK with ON DELETE CASCADE missing/,
  );
});

test('verifySchemaMigrationEffects rejects missing CHECK constraints on payment_settlements', async () => {
  const mockDb = createMockValidSchemaDb({
    "tc.constraint_type = 'CHECK'": {
      rows: [
        // Missing method check
        {
          constraint_name: 'payment_settlements_reference_check',
          constraint_def: 'CHECK ((length(TRIM(BOTH FROM reference)) >= 3))',
        },
        {
          constraint_name: 'payment_settlements_amount_usd_check',
          constraint_def: 'CHECK ((amount_usd > (0)::numeric))',
        },
      ],
    },
  });
  await assert.rejects(
    verifySchemaMigrationEffects(mockDb),
    /payment_settlements CHECK constraint \(method = 'cash'\) missing/,
  );
});

test('verifySchemaMigrationEffects rejects missing trigger function or misconfigured trigger event', async () => {
  // Trigger function missing
  const missingProcDb = createMockValidSchemaDb({
    'FROM pg_proc': { rows: [], rowCount: 0 },
  });
  await assert.rejects(
    verifySchemaMigrationEffects(missingProcDb),
    /function reject_payment_audit_mutation\(\) in plpgsql missing/,
  );

  // Trigger event mismatch (e.g. AFTER instead of BEFORE)
  const wrongTriggerDb = createMockValidSchemaDb({
    'FROM pg_trigger': {
      rows: [
        {
          tgname: 'payment_audit_immutable',
          tgenabled: 'O',
          trigger_def:
            'CREATE TRIGGER payment_audit_immutable AFTER DELETE ON public.payment_settlements FOR EACH ROW EXECUTE FUNCTION reject_payment_audit_mutation()',
          proc_name: 'reject_payment_audit_mutation',
        },
        {
          tgname: 'payment_audit_no_truncate',
          tgenabled: 'O',
          trigger_def:
            'CREATE TRIGGER payment_audit_no_truncate BEFORE TRUNCATE ON public.payment_settlements FOR EACH STATEMENT EXECUTE FUNCTION reject_payment_audit_mutation()',
          proc_name: 'reject_payment_audit_mutation',
        },
      ],
      rowCount: 2,
    },
  });
  await assert.rejects(
    verifySchemaMigrationEffects(wrongTriggerDb),
    /trigger payment_audit_immutable timing\/event\/level mismatch/,
  );
});

// ===========================================================================
// RECONCILIATION ROLLBACK & DRY-RUN TESTS
// ===========================================================================

test('reconcileMigrations dry-run reports planned actions without executing write operations', async () => {
  const mockDb = createMockValidSchemaDb({
    to_regclass: { rows: [{ regclass: null }] },
  });

  const result = await reconcileMigrations(mockDb, { execute: false });
  assert.equal(result.dryRun, true);
  assert.equal(result.trackingTableExists, false);
  assert.equal(result.actions.length, 3);
  assert.ok(result.actions.every(a => a.action === 'insert'));

  // Ensure no BEGIN/COMMIT/INSERT queries were executed
  const executedSql = mockDb.queries.map(q => q.sql.toUpperCase());
  assert.ok(!executedSql.includes('BEGIN'));
  assert.ok(!executedSql.includes('COMMIT'));
  assert.ok(!executedSql.some(sql => sql.startsWith('INSERT')));
});

test('reconcileMigrations rolls back transaction when checksum mismatch occurs', async () => {
  const mockDb = createMockValidSchemaDb({
    'FROM schema_migrations': {
      rows: [
        {
          version: '001',
          name: '001_order_idempotency_alignment.sql',
          checksum: 'mismatched_corrupt_checksum_000000000000000000000000000000000000',
        },
      ],
      rowCount: 1,
    },
  });

  await assert.rejects(
    reconcileMigrations(mockDb, { execute: true, allowDisposableTest: true }),
    /checksum mismatch in existing tracking table/,
  );

  const executedSql = mockDb.queries.map(q => q.sql.toUpperCase());
  assert.ok(executedSql.includes('BEGIN'), 'Must open transaction');
  assert.ok(executedSql.includes('ROLLBACK'), 'Must roll back on error');
  assert.ok(!executedSql.includes('COMMIT'), 'Must not commit on error');
});

test('reconcileMigrations rolls back transaction when query error occurs during execution', async () => {
  const mockDb = createMockValidSchemaDb({
    'FROM schema_migrations': { rows: [], rowCount: 0 },
    'INSERT INTO schema_migrations': () => {
      throw new Error('Injected database disk failure');
    },
  });

  await assert.rejects(
    reconcileMigrations(mockDb, { execute: true, allowDisposableTest: true }),
    /Injected database disk failure/,
  );

  const executedSql = mockDb.queries.map(q => q.sql.toUpperCase());
  assert.ok(executedSql.includes('BEGIN'));
  assert.ok(executedSql.includes('ROLLBACK'));
  assert.ok(!executedSql.includes('COMMIT'));
});
