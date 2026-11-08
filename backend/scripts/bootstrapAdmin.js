import pg from 'pg';
import bcrypt from 'bcryptjs';
import { AUTHORIZED_TARGETS, assertAuthorizedStagingTarget } from './reconcileMigrations.js';

/**
 * Secure one-time administrator bootstrap procedure for Neon staging.
 *
 * SAFETY CONSTRAINTS:
 * 1. Restricted exclusively to the verified Neon staging branch:
 *    - Project ID: spring-rain-57515077
 *    - Staging Branch: br-silent-water-a1z4n5ct
 *    - Staging Endpoint: ep-restless-heart-a1opinu4
 *    - Database: coffee_shop
 * 2. Strictly rejects production branch (br-shy-sky-a14lgyqi) and any non-staging endpoint.
 * 3. Requires explicit operator authorization via CONFIRM_STAGING_BOOTSTRAP=true.
 * 4. Accepts credentials ONLY from environment variables (never hardcoded):
 *    - BOOTSTRAP_ADMIN_EMAIL
 *    - BOOTSTRAP_ADMIN_PASSWORD (min 12 chars, complexity checked)
 *    - BOOTSTRAP_ADMIN_NAME
 * 5. Uses bcryptjs with salt rounds = 12.
 * 6. Executes within a PostgreSQL transaction with rollback on any failure.
 * 7. Requires PostgreSQL TLS with sslmode=verify-full (rejectUnauthorized: false is removed).
 * 8. Acquires a transaction-scoped advisory lock (85105003) to serialize concurrent execution.
 * 9. Confirms the entire staff_users table is empty before provisioning; rejects if any staff account exists.
 *
 * DO NOT EXECUTE AUTONOMOUSLY. Requires explicit human operator approval.
 */

export const BOOTSTRAP_ADVISORY_LOCK_ID = 85105003;

export function validateBootstrapInput(env = process.env) {
  const errors = [];

  if (env.CONFIRM_STAGING_BOOTSTRAP !== 'true') {
    errors.push('CONFIRM_STAGING_BOOTSTRAP=true is required to authorize the bootstrap');
  }

  const email = (env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('BOOTSTRAP_ADMIN_EMAIL must be a valid email address');
  }

  const password = env.BOOTSTRAP_ADMIN_PASSWORD || '';
  if (password.length < 12) {
    errors.push('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters');
  }
  if (/^(?:password|admin123|changeme|test|default)/i.test(password)) {
    errors.push('BOOTSTRAP_ADMIN_PASSWORD cannot be a common or predictable default');
  }

  const name = (env.BOOTSTRAP_ADMIN_NAME || '').trim();
  if (!name || name.length > 100) {
    errors.push('BOOTSTRAP_ADMIN_NAME must be a non-empty string up to 100 characters');
  }

  const databaseUrl = (env.DATABASE_URL || '').trim();
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection URL');
  } else {
    try {
      const parsedUrl = new URL(databaseUrl);
      const sslmode = parsedUrl.searchParams.get('sslmode');
      if (sslmode !== 'verify-full') {
        errors.push('DATABASE_URL must require TLS with sslmode=verify-full');
      }
    } catch {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection URL');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Bootstrap validation failed:\n  - ${errors.join('\n  - ')}`);
  }

  return { email, password, name, databaseUrl };
}

export function createBootstrapPgClient(databaseUrl) {
  return new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
  });
}

export async function bootstrapAdminUser(env = process.env, clientOrOptions = null) {
  const { email, password, name, databaseUrl } = validateBootstrapInput(env);

  let clientOverride = null;
  if (clientOrOptions) {
    if (typeof clientOrOptions.query === 'function') {
      clientOverride = clientOrOptions;
    } else if (typeof clientOrOptions === 'object' && clientOrOptions.client) {
      clientOverride = clientOrOptions.client;
    }
  }

  const client = clientOverride || createBootstrapPgClient(databaseUrl);

  if (typeof client.connect === 'function') {
    await client.connect();
  }

  let inTransaction = false;
  try {
    // 1. Enforce fail-closed staging branch identity verification
    const targetInfo = await assertAuthorizedStagingTarget(client, databaseUrl);
    console.log(`[BOOTSTRAP] Target verified: database=${targetInfo.database}, branch=${targetInfo.branch_id}, endpoint=${targetInfo.endpoint_id}`);

    // 2. Atomic transaction with transaction-scoped advisory lock
    await client.query('BEGIN');
    inTransaction = true;

    // Acquire transaction-scoped advisory lock to serialize concurrent bootstrap attempts
    await client.query(`SELECT pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK_ID})`);

    // 3. Confirm entire staff_users table is empty before creating the first administrator
    const existingRes = await client.query(
      'SELECT id, email, role, is_active FROM staff_users ORDER BY id ASC'
    );

    if (existingRes.rows.length > 0) {
      const matchingEmail = existingRes.rows.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (matchingEmail) {
        throw new Error(`Bootstrap aborted: Staff user already exists with email [${matchingEmail.email}] (id=${matchingEmail.id}, role=${matchingEmail.role}, active=${matchingEmail.is_active}).`);
      }
      const count = existingRes.rows.length;
      const first = existingRes.rows[0];
      throw new Error(`Bootstrap aborted: staff_users table is not empty (${count} existing account${count > 1 ? 's' : ''} found, e.g. [${first.email}] id=${first.id}, role=${first.role}). Administrator provisioning is only permitted on an empty table.`);
    }

    // 4. Hash password with bcryptjs (salt rounds = 12)
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(password, salt);

    // 5. Parameterized insert of the first administrator
    const insertRes = await client.query(`
      INSERT INTO staff_users (email, full_name, role, password_hash, is_active)
      VALUES ($1, $2, 'admin', $3, true)
      RETURNING id, email, full_name, role, is_active, created_at
    `, [email, name, passwordHash]);

    const created = insertRes.rows[0];

    await client.query('COMMIT');
    inTransaction = false;

    console.log(`[BOOTSTRAP] Successfully provisioned administrator: id=${created.id}, email=${created.email}, role=${created.role}, active=${created.is_active}`);
    return created;
  } catch (err) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        throw new AggregateError([err, rollbackError], 'Transaction rollback failed.');
      }
    }
    throw err;
  } finally {
    if (typeof client.end === 'function') {
      try {
        await client.end();
      } catch {
        // ignore client close errors in finally
      }
    }
  }
}

// Execution guard: Only run if invoked directly from CLI with explicit operator authorization
if (process.argv[1] && process.argv[1].endsWith('bootstrapAdmin.js')) {
  if (process.env.CONFIRM_STAGING_BOOTSTRAP !== 'true') {
    console.error('=== Brew & Boba Café: Staging Administrator Bootstrap ===');
    console.error('This script provisions the initial administrator account on the Neon staging branch.');
    console.error('SAFETY GUARD: Execution requires explicit operator confirmation.');
    console.error('');
    console.error('Required environment variables:');
    console.error('  CONFIRM_STAGING_BOOTSTRAP=true');
    console.error('  DATABASE_URL=<staging-connection-string-with-sslmode=verify-full>');
    console.error('  BOOTSTRAP_ADMIN_EMAIL=<admin-email>');
    console.error('  BOOTSTRAP_ADMIN_PASSWORD=<min-12-char-password>');
    console.error('  BOOTSTRAP_ADMIN_NAME=<administrator-full-name>');
    console.error('');
    console.error('Authorized target:');
    console.error(`  Project:  ${AUTHORIZED_TARGETS.projectId}`);
    console.error(`  Branch:   ${AUTHORIZED_TARGETS.stagingBranchId}`);
    console.error(`  Endpoint: ${AUTHORIZED_TARGETS.stagingEndpointId}`);
    console.error(`  Database: ${AUTHORIZED_TARGETS.stagingDatabase}`);
    process.exit(1);
  }

  bootstrapAdminUser()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[BOOTSTRAP ERROR]:', err.message);
      process.exit(1);
    });
}
