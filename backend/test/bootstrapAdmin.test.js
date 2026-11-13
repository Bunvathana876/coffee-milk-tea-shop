import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {
  validateBootstrapInput,
  createBootstrapPgClient,
  bootstrapAdminUser,
  BOOTSTRAP_ADVISORY_LOCK_ID,
} from '../scripts/bootstrapAdmin.js';
import { AUTHORIZED_TARGETS } from '../scripts/reconcileMigrations.js';

const VALID_STAGING_URL = `postgresql://coffee_shop_owner:secure_pass_123@${AUTHORIZED_TARGETS.stagingEndpointId}.ap-southeast-1.aws.neon.tech/${AUTHORIZED_TARGETS.stagingDatabase}?sslmode=verify-full`;

function validEnv(overrides = {}) {
  return {
    CONFIRM_STAGING_BOOTSTRAP: 'true',
    BOOTSTRAP_ADMIN_EMAIL: 'ops-admin@brewboba.com',
    BOOTSTRAP_ADMIN_PASSWORD: 'a-very-strong-and-unique-password-2026',
    BOOTSTRAP_ADMIN_NAME: 'Staging Operations Admin',
    DATABASE_URL: VALID_STAGING_URL,
    ...overrides,
  };
}

function createMockClient(options = {}) {
  const {
    currentDb = AUTHORIZED_TARGETS.stagingDatabase,
    branchId = AUTHORIZED_TARGETS.stagingBranchId,
    endpointId = AUTHORIZED_TARGETS.stagingEndpointId,
    projectId = AUTHORIZED_TARGETS.projectId,
    existingUsers = [],
    insertError = null,
    rollbackError = null,
    advisoryLockError = null,
  } = options;

  const queries = [];
  let ended = false;
  let capturedInsertParams = null;

  const client = {
    queries,
    get ended() {
      return ended;
    },
    get capturedInsertParams() {
      return capturedInsertParams;
    },
    async connect() {},
    async end() {
      ended = true;
    },
    async query(sql, params = []) {
      const cleanSql = sql.trim();
      queries.push({ sql: cleanSql, params });

      if (cleanSql.includes('current_database()')) {
        return {
          rows: [
            {
              current_db: currentDb,
              branch_id: branchId,
              endpoint_id: endpointId,
              project_id: projectId,
            },
          ],
        };
      }

      if (cleanSql === 'BEGIN') {
        return { rows: [], rowCount: 0 };
      }

      if (cleanSql.includes('pg_advisory_xact_lock')) {
        if (advisoryLockError) {
          throw advisoryLockError;
        }
        return { rows: [], rowCount: 0 };
      }

      if (cleanSql === 'COMMIT') {
        return { rows: [], rowCount: 0 };
      }

      if (cleanSql === 'ROLLBACK') {
        if (rollbackError) {
          throw rollbackError;
        }
        return { rows: [], rowCount: 0 };
      }

      if (cleanSql.includes('FROM staff_users')) {
        return { rows: [...existingUsers], rowCount: existingUsers.length };
      }

      if (cleanSql.includes('INSERT INTO staff_users')) {
        if (insertError) {
          throw insertError;
        }
        capturedInsertParams = params;
        return {
          rows: [
            {
              id: 1,
              email: params[0],
              full_name: params[1],
              role: 'admin',
              password_hash: params[2],
              is_active: true,
              created_at: new Date().toISOString(),
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    },
  };

  return client;
}

test('validateBootstrapInput requires explicit confirmation', () => {
  assert.throws(
    () => validateBootstrapInput({}),
    error =>
      error instanceof Error && /CONFIRM_STAGING_BOOTSTRAP=true is required/.test(error.message),
  );
});

test('validateBootstrapInput validates email format', () => {
  assert.throws(
    () => validateBootstrapInput(validEnv({ BOOTSTRAP_ADMIN_EMAIL: 'invalid-email' })),
    error =>
      error instanceof Error && /BOOTSTRAP_ADMIN_EMAIL must be a valid email/.test(error.message),
  );
});

test('validateBootstrapInput enforces minimum password length and rejects common passwords', () => {
  assert.throws(
    () => validateBootstrapInput(validEnv({ BOOTSTRAP_ADMIN_PASSWORD: 'short' })),
    error => error instanceof Error && /at least 12 characters/.test(error.message),
  );

  assert.throws(
    () => validateBootstrapInput(validEnv({ BOOTSTRAP_ADMIN_PASSWORD: 'password12345678' })),
    error =>
      error instanceof Error && /cannot be a common or predictable default/.test(error.message),
  );
});

test('validateBootstrapInput accepts valid operator input', () => {
  const result = validateBootstrapInput(validEnv());
  assert.equal(result.email, 'ops-admin@brewboba.com');
  assert.equal(result.name, 'Staging Operations Admin');
  assert.equal(result.password, 'a-very-strong-and-unique-password-2026');
  assert.equal(result.databaseUrl, VALID_STAGING_URL);
});

test('validateBootstrapInput requires TLS with sslmode=verify-full in DATABASE_URL', () => {
  assert.throws(
    () =>
      validateBootstrapInput(
        validEnv({
          DATABASE_URL: `postgresql://user:pass@${AUTHORIZED_TARGETS.stagingEndpointId}.aws.neon.tech/${AUTHORIZED_TARGETS.stagingDatabase}`,
        }),
      ),
    error =>
      error instanceof Error &&
      /DATABASE_URL must require TLS with sslmode=verify-full/.test(error.message),
  );

  assert.throws(
    () =>
      validateBootstrapInput(
        validEnv({
          DATABASE_URL: `postgresql://user:pass@${AUTHORIZED_TARGETS.stagingEndpointId}.aws.neon.tech/${AUTHORIZED_TARGETS.stagingDatabase}?sslmode=require`,
        }),
      ),
    error =>
      error instanceof Error &&
      /DATABASE_URL must require TLS with sslmode=verify-full/.test(error.message),
  );

  assert.throws(
    () =>
      validateBootstrapInput(
        validEnv({
          DATABASE_URL: `postgresql://user:pass@${AUTHORIZED_TARGETS.stagingEndpointId}.aws.neon.tech/${AUTHORIZED_TARGETS.stagingDatabase}?sslmode=disable`,
        }),
      ),
    error =>
      error instanceof Error &&
      /DATABASE_URL must require TLS with sslmode=verify-full/.test(error.message),
  );

  assert.throws(
    () =>
      validateBootstrapInput(
        validEnv({
          DATABASE_URL: 'not-a-postgres-url',
        }),
      ),
    error =>
      error instanceof Error &&
      /DATABASE_URL must be a valid PostgreSQL connection URL/.test(error.message),
  );
});

test('createBootstrapPgClient configures TLS without rejectUnauthorized: false', () => {
  const client = createBootstrapPgClient(VALID_STAGING_URL);
  assert.notEqual(
    client.ssl?.rejectUnauthorized,
    false,
    'rejectUnauthorized: false must not be present',
  );
  assert.deepEqual(
    client.ssl,
    {},
    'sslmode=verify-full must resolve to strict TLS verification ({})',
  );
});

test('bootstrapAdminUser rejects unauthorized branches fail-closed before opening transaction', async () => {
  const mockClient = createMockClient({
    branchId: 'br-unauthorized-rogue-branch-xyz',
  });

  await assert.rejects(
    bootstrapAdminUser(validEnv(), mockClient),
    error =>
      error instanceof Error &&
      /Target guard failed: Connected branch.*does not match authorized staging branch/.test(
        error.message,
      ),
  );

  const executedSql = mockClient.queries.map(q => q.sql);
  assert.ok(!executedSql.includes('BEGIN'), 'Must not begin transaction on unauthorized branch');
  assert.ok(
    !executedSql.some(sql => sql.includes('pg_advisory_xact_lock')),
    'Must not acquire advisory lock',
  );
  assert.ok(
    !executedSql.some(sql => sql.includes('staff_users')),
    'Must not touch staff_users table',
  );
  assert.ok(!executedSql.includes('COMMIT'), 'Must not commit');
  assert.equal(mockClient.ended, true, 'Client connection must be closed');
});

test('bootstrapAdminUser rejects production branch fail-closed before transaction', async () => {
  const mockClient = createMockClient({
    branchId: AUTHORIZED_TARGETS.productionBranchId,
    endpointId: AUTHORIZED_TARGETS.stagingEndpointId,
  });

  await assert.rejects(
    bootstrapAdminUser(validEnv(), mockClient),
    error =>
      error instanceof Error &&
      /CRITICAL TARGET GUARD: Connected database session is identified as PRODUCTION/.test(
        error.message,
      ),
  );

  const executedSql = mockClient.queries.map(q => q.sql);
  assert.ok(!executedSql.includes('BEGIN'), 'Must not begin transaction on production branch');
  assert.ok(!executedSql.includes('COMMIT'), 'Must not commit');
  assert.equal(mockClient.ended, true, 'Client connection must be closed');
});

test('bootstrapAdminUser rejects production endpoint in session fail-closed before transaction', async () => {
  const mockClient = createMockClient({
    branchId: AUTHORIZED_TARGETS.stagingBranchId,
    endpointId: AUTHORIZED_TARGETS.productionEndpointId,
  });

  await assert.rejects(
    bootstrapAdminUser(validEnv(), mockClient),
    error =>
      error instanceof Error &&
      /CRITICAL TARGET GUARD: Connected database session is identified as PRODUCTION/.test(
        error.message,
      ),
  );

  const executedSql = mockClient.queries.map(q => q.sql);
  assert.ok(!executedSql.includes('BEGIN'), 'Must not begin transaction on production endpoint');
  assert.equal(mockClient.ended, true, 'Client connection must be closed');
});

test('bootstrapAdminUser rejects production endpoint in DATABASE_URL fail-closed', async () => {
  const mockClient = createMockClient();
  const prodUrlEnv = validEnv({
    DATABASE_URL: `postgresql://user:pass@${AUTHORIZED_TARGETS.productionEndpointId}.aws.neon.tech/${AUTHORIZED_TARGETS.stagingDatabase}?sslmode=verify-full`,
  });

  await assert.rejects(
    bootstrapAdminUser(prodUrlEnv, mockClient),
    error =>
      error instanceof Error &&
      /CRITICAL TARGET GUARD: Writes to production branch or endpoint are strictly prohibited/.test(
        error.message,
      ),
  );

  const executedSql = mockClient.queries.map(q => q.sql);
  assert.ok(
    !executedSql.includes('BEGIN'),
    'Must not begin transaction when DATABASE_URL points to production',
  );
  assert.equal(mockClient.ended, true, 'Client connection must be closed');
});

test('bootstrapAdminUser rejects unauthorized database name in session fail-closed', async () => {
  const mockClient = createMockClient({
    currentDb: 'unauthorized_db',
  });

  await assert.rejects(
    bootstrapAdminUser(validEnv(), mockClient),
    error =>
      error instanceof Error &&
      /Target guard failed: Connected database \[unauthorized_db\] does not match authorized database/.test(
        error.message,
      ),
  );

  const executedSql = mockClient.queries.map(q => q.sql);
  assert.ok(
    !executedSql.includes('BEGIN'),
    'Must not begin transaction when database name is unauthorized',
  );
  assert.equal(mockClient.ended, true, 'Client connection must be closed');
});

test('bootstrapAdminUser acquires transaction-scoped advisory lock after BEGIN', async () => {
  const mockClient = createMockClient();

  await bootstrapAdminUser(validEnv(), mockClient);

  const executedSql = mockClient.queries.map(q => q.sql);
  const beginIndex = executedSql.indexOf('BEGIN');
  const lockIndex = executedSql.findIndex(sql =>
    sql.includes(`pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK_ID})`),
  );
  const selectUsersIndex = executedSql.findIndex(sql => sql.includes('FROM staff_users'));

  assert.ok(beginIndex !== -1, 'Must begin transaction');
  assert.ok(lockIndex !== -1, 'Must acquire advisory lock');
  assert.ok(selectUsersIndex !== -1, 'Must check staff_users');
  assert.ok(beginIndex < lockIndex, 'BEGIN must precede pg_advisory_xact_lock');
  assert.ok(lockIndex < selectUsersIndex, 'pg_advisory_xact_lock must precede staff_users query');
});

test('bootstrapAdminUser rejects duplicate administrator with identical email', async () => {
  const mockClient = createMockClient({
    existingUsers: [{ id: 42, email: 'ops-admin@brewboba.com', role: 'admin', is_active: true }],
  });

  await assert.rejects(
    bootstrapAdminUser(validEnv(), mockClient),
    error =>
      error instanceof Error &&
      /Bootstrap aborted: Staff user already exists with email \[ops-admin@brewboba.com\] \(id=42, role=admin, active=true\)/.test(
        error.message,
      ),
  );

  const executedSql = mockClient.queries.map(q => q.sql);
  assert.ok(executedSql.includes('BEGIN'), 'Must begin transaction');
  assert.ok(
    executedSql.some(sql => sql.includes(`pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK_ID})`)),
    'Must acquire advisory lock',
  );
  assert.ok(
    executedSql.some(sql => sql.includes('SELECT id, email, role, is_active FROM staff_users')),
    'Must query staff_users',
  );
  assert.ok(executedSql.includes('ROLLBACK'), 'Must roll back on existing account');
  assert.ok(!executedSql.includes('COMMIT'), 'Must not commit when account already exists');
  assert.ok(
    !executedSql.some(sql => sql.startsWith('INSERT INTO staff_users')),
    'Must not insert user',
  );
  assert.equal(mockClient.ended, true, 'Client connection must be closed');
});

test('bootstrapAdminUser rejects provisioning when any other staff account already exists', async () => {
  const mockClient = createMockClient({
    existingUsers: [
      { id: 99, email: 'existing-barista@brewboba.com', role: 'staff', is_active: true },
    ],
  });

  await assert.rejects(
    bootstrapAdminUser(validEnv(), mockClient),
    error =>
      error instanceof Error &&
      /Bootstrap aborted: staff_users table is not empty \(1 existing account found, e.g. \[existing-barista@brewboba.com\] id=99, role=staff\)/.test(
        error.message,
      ),
  );

  const executedSql = mockClient.queries.map(q => q.sql);
  assert.ok(executedSql.includes('BEGIN'), 'Must begin transaction');
  assert.ok(
    executedSql.some(sql => sql.includes(`pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK_ID})`)),
    'Must acquire advisory lock',
  );
  assert.ok(executedSql.includes('ROLLBACK'), 'Must roll back when table is not empty');
  assert.ok(!executedSql.includes('COMMIT'), 'Must not commit when table is not empty');
  assert.ok(
    !executedSql.some(sql => sql.startsWith('INSERT INTO staff_users')),
    'Must not insert user',
  );
  assert.equal(mockClient.ended, true, 'Client connection must be closed');
});

test('bootstrapAdminUser serializes concurrent bootstrap attempts via advisory lock and prevents duplicate provisioning', async () => {
  const sharedStaffUsers = [];
  let advisoryLockHeld = false;
  const lockWaiters = [];

  function acquireLock() {
    if (!advisoryLockHeld) {
      advisoryLockHeld = true;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      lockWaiters.push(resolve);
    });
  }

  function releaseLock() {
    advisoryLockHeld = false;
    if (lockWaiters.length > 0) {
      const next = lockWaiters.shift();
      advisoryLockHeld = true;
      next();
    }
  }

  function createConcurrentMockClient(clientId) {
    const queries = [];
    let ended = false;
    let holdsLock = false;

    return {
      id: clientId,
      queries,
      get ended() {
        return ended;
      },
      async connect() {},
      async end() {
        if (holdsLock) {
          holdsLock = false;
          releaseLock();
        }
        ended = true;
      },
      async query(sql, params = []) {
        const cleanSql = sql.trim();
        queries.push({ sql: cleanSql, params });

        if (cleanSql.includes('current_database()')) {
          return {
            rows: [
              {
                current_db: AUTHORIZED_TARGETS.stagingDatabase,
                branch_id: AUTHORIZED_TARGETS.stagingBranchId,
                endpoint_id: AUTHORIZED_TARGETS.stagingEndpointId,
                project_id: AUTHORIZED_TARGETS.projectId,
              },
            ],
          };
        }

        if (cleanSql === 'BEGIN') {
          return { rows: [], rowCount: 0 };
        }

        if (cleanSql.includes('pg_advisory_xact_lock')) {
          await acquireLock();
          holdsLock = true;
          return { rows: [], rowCount: 0 };
        }

        if (cleanSql.includes('FROM staff_users')) {
          return {
            rows: [...sharedStaffUsers],
            rowCount: sharedStaffUsers.length,
          };
        }

        if (cleanSql.includes('INSERT INTO staff_users')) {
          const newUser = {
            id: sharedStaffUsers.length + 1,
            email: params[0],
            full_name: params[1],
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString(),
          };
          sharedStaffUsers.push(newUser);
          return {
            rows: [newUser],
            rowCount: 1,
          };
        }

        if (cleanSql === 'COMMIT') {
          if (holdsLock) {
            holdsLock = false;
            releaseLock();
          }
          return { rows: [], rowCount: 0 };
        }

        if (cleanSql === 'ROLLBACK') {
          if (holdsLock) {
            holdsLock = false;
            releaseLock();
          }
          return { rows: [], rowCount: 0 };
        }

        return { rows: [], rowCount: 0 };
      },
    };
  }

  const clientA = createConcurrentMockClient('clientA');
  const clientB = createConcurrentMockClient('clientB');

  const envA = validEnv({
    BOOTSTRAP_ADMIN_EMAIL: 'admin-a@brewboba.com',
    BOOTSTRAP_ADMIN_NAME: 'Admin A',
  });
  const envB = validEnv({
    BOOTSTRAP_ADMIN_EMAIL: 'admin-b@brewboba.com',
    BOOTSTRAP_ADMIN_NAME: 'Admin B',
  });

  const [resA, resB] = await Promise.allSettled([
    bootstrapAdminUser(envA, clientA),
    bootstrapAdminUser(envB, clientB),
  ]);

  const succeeded = [resA, resB].filter(r => r.status === 'fulfilled');
  const rejected = [resA, resB].filter(r => r.status === 'rejected');

  assert.equal(succeeded.length, 1, 'Exactly one concurrent attempt must succeed');
  assert.equal(rejected.length, 1, 'The competing concurrent attempt must be rejected');

  assert.match(
    rejected[0].reason.message,
    /Bootstrap aborted: staff_users table is not empty|Staff user already exists/,
    'Rejected attempt must report that staff_users is not empty',
  );

  assert.equal(sharedStaffUsers.length, 1, 'Only one administrator must be created in total');

  assert.ok(clientA.queries.some(q => q.sql.includes('pg_advisory_xact_lock')));
  assert.ok(clientB.queries.some(q => q.sql.includes('pg_advisory_xact_lock')));

  assert.equal(clientA.ended, true);
  assert.equal(clientB.ended, true);
});

test('bootstrapAdminUser surfaces transaction rollback failure when rollback fails on duplicate user', async () => {
  const mockClient = createMockClient({
    existingUsers: [{ id: 42, email: 'ops-admin@brewboba.com', role: 'admin', is_active: true }],
    rollbackError: new Error('Simulated network drop during rollback'),
  });

  await assert.rejects(bootstrapAdminUser(validEnv(), mockClient), error => {
    assert.ok(error instanceof AggregateError, 'Must throw AggregateError on rollback failure');
    assert.equal(error.message, 'Transaction rollback failed.');
    assert.equal(error.errors.length, 2);
    assert.match(error.errors[0].message, /Bootstrap aborted: Staff user already exists/);
    assert.match(error.errors[1].message, /Simulated network drop during rollback/);
    return true;
  });

  const executedSql = mockClient.queries.map(q => q.sql);
  assert.ok(executedSql.includes('BEGIN'));
  assert.ok(
    executedSql.some(sql => sql.includes(`pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK_ID})`)),
  );
  assert.ok(executedSql.includes('ROLLBACK'));
  assert.ok(!executedSql.includes('COMMIT'));
  assert.equal(mockClient.ended, true, 'Client connection must be closed');
});

test('bootstrapAdminUser surfaces transaction rollback failure when rollback fails on insert error', async () => {
  const mockClient = createMockClient({
    insertError: new Error('Simulated disk full on staff insert'),
    rollbackError: new Error('Simulated socket error on rollback'),
  });

  await assert.rejects(bootstrapAdminUser(validEnv(), mockClient), error => {
    assert.ok(error instanceof AggregateError, 'Must throw AggregateError on rollback failure');
    assert.equal(error.message, 'Transaction rollback failed.');
    assert.equal(error.errors.length, 2);
    assert.match(error.errors[0].message, /Simulated disk full on staff insert/);
    assert.match(error.errors[1].message, /Simulated socket error on rollback/);
    return true;
  });

  const executedSql = mockClient.queries.map(q => q.sql);
  assert.ok(executedSql.includes('BEGIN'));
  assert.ok(
    executedSql.some(sql => sql.includes(`pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK_ID})`)),
  );
  assert.ok(executedSql.includes('ROLLBACK'));
  assert.ok(!executedSql.includes('COMMIT'));
  assert.equal(mockClient.ended, true, 'Client connection must be closed');
});

test('bootstrapAdminUser successfully provisions the first administrator on empty staff_users', async () => {
  const mockClient = createMockClient();

  const user = await bootstrapAdminUser(validEnv(), mockClient);

  assert.equal(user.email, 'ops-admin@brewboba.com');
  assert.equal(user.full_name, 'Staging Operations Admin');
  assert.equal(user.role, 'admin');
  assert.equal(user.is_active, true);

  // Verify bcrypt password hashing with salt rounds = 12
  assert.ok(mockClient.capturedInsertParams, 'Insert params must be captured');
  const [capturedEmail, capturedName, capturedPasswordHash] = mockClient.capturedInsertParams;
  assert.equal(capturedEmail, 'ops-admin@brewboba.com');
  assert.equal(capturedName, 'Staging Operations Admin');
  assert.ok(capturedPasswordHash.startsWith('$2'), 'Password hash must be a valid bcrypt hash');
  assert.ok(
    bcrypt.compareSync('a-very-strong-and-unique-password-2026', capturedPasswordHash),
    'Password hash must match operator password via bcrypt verification',
  );

  const executedSql = mockClient.queries.map(q => q.sql);
  assert.ok(executedSql.includes('BEGIN'));
  assert.ok(
    executedSql.some(sql => sql.includes(`pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK_ID})`)),
  );
  assert.ok(
    executedSql.some(sql => sql.includes('SELECT id, email, role, is_active FROM staff_users')),
  );
  assert.ok(executedSql.some(sql => sql.startsWith('INSERT INTO staff_users')));
  assert.ok(executedSql.includes('COMMIT'), 'Must commit on success');
  assert.ok(!executedSql.includes('ROLLBACK'), 'Must not roll back on success');
  assert.equal(mockClient.ended, true, 'Client connection must be closed');
});
