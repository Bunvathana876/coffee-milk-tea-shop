/**
 * Brew & Boba Café — Cloudinary Phase 2.
 * Default mode: READ-ONLY dry run. Does not change the database.
 * Apply mode requires BOTH --apply and an explicit confirmation environment variable.
 * Run from the backend project, after reviewing the mapping and connecting ONLY a local dev DB.
 *
 * Uses project's backend/src/config.js and installed pg package; no extra dependency.
 */
import pg from 'pg';
import { config, isProductionOrStaging } from '../src/config.js';

const { Client } = pg;
const rowsToMap = Object.freeze([
  {
    id: 3,
    name: 'Cappuccino',
    category: 'Coffee',
    currentImage: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80',
    url: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704052/02_cappuccino.png',
  },
  {
    id: 4,
    name: 'Caramel Macchiato',
    category: 'Coffee',
    currentImage: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
    url: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704349/caramel_macchiato_with_caramel_lattice_foam_transparent.png',
  },
  {
    id: 16,
    name: 'Iced Matcha Latte',
    category: 'Matcha',
    currentImage: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
    url: 'https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/08_iced_matcha_latte.png',
  },
]);

const CONFIRMATION = 'APPROVE_LOCAL_DEV_CLOUDINARY_3_4_16';
const apply = process.argv.includes('--apply');
const validArgs = new Set(['--apply', '--dry-run']);
if (process.argv.slice(2).some(arg => !validArgs.has(arg))) {
  console.error('Usage: node scripts/cloudinary-phase2.mjs [--dry-run | --apply]');
  process.exit(2);
}
if (isProductionOrStaging() || (config.environment || '').toLowerCase() !== 'development') {
  console.error('BLOCKED: this script accepts ENVIRONMENT=development only, never staging or production.');
  process.exit(2);
}

let parsed;
try {
  parsed = new URL(config.databaseUrl);
} catch {
  console.error('BLOCKED: DATABASE_URL/PG configuration is not a valid connection URL.');
  process.exit(2);
}
const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
const allowedLocalHosts = new Set(['localhost', '127.0.0.1', '::1']);
if (!allowedLocalHosts.has(hostname)) {
  console.error('BLOCKED: database host must be local (localhost, 127.0.0.1, or ::1).');
  process.exit(2);
}
if (Number(parsed.port) !== 5433) {
  console.error('BLOCKED: approved local development port is 5433.');
  process.exit(2);
}
const expectedDatabase = 'coffee_shop';
const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
if (databaseName !== expectedDatabase) {
  console.error(`BLOCKED: expected database ${expectedDatabase}, found ${databaseName || '(none)'}.`);
  process.exit(2);
}
if (apply && process.env.CONFIRM_LOCAL_DEV_IMAGE_UPDATE !== CONFIRMATION) {
  console.error('BLOCKED: --apply also requires CONFIRM_LOCAL_DEV_IMAGE_UPDATE set to the exact approval phrase documented in README.');
  process.exit(2);
}

function normalize(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en');
}
function assertMatchingProducts(actualRows) {
  if (actualRows.length !== rowsToMap.length) {
    throw new Error(`Expected ${rowsToMap.length} product records, got ${actualRows.length}. No change made.`);
  }
  for (const proposed of rowsToMap) {
    const actual = actualRows.find(row => Number(row.id) === proposed.id);
    if (!actual || normalize(actual.name) !== normalize(proposed.name) || normalize(actual.category) !== normalize(proposed.category)) {
      throw new Error(`Product ID ${proposed.id} name/category mismatch. No change made.`);
    }
    if (actual.image !== proposed.currentImage) {
      throw new Error(`Product ID ${proposed.id} current image differs from the approved value. No change made.`);
    }
  }
}

const productQuery = `
  SELECT p.id, p.name, c.name AS category, p.image
  FROM products AS p
  JOIN categories AS c ON c.id = p.category_id
  WHERE p.id = ANY($1::int[])
  ORDER BY p.id ASC
`;
const client = new Client({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
});
let inTransaction = false;
try {
  await client.connect();
  const info = await client.query(`
    SELECT current_database() AS database, inet_server_addr()::text AS address, inet_server_port() AS port
  `);
  const identity = info.rows[0];
  if (
    identity.database !== expectedDatabase ||
    identity.port !== 5433 ||
    !['127.0.0.1', '::1/128'].includes(identity.address)
  ) {
    throw new Error('Connected server identity differs from approved local database.');
  }
  console.log(`Mode: ${apply ? 'LOCAL DEVELOPMENT UPDATE' : 'READ-ONLY DRY RUN'}`);
  console.log(`Database: ${identity.database} | Config host: ${hostname} | Server address: ${identity.address ?? '(local socket)'} | Port: ${identity.port}`);
  console.log('Cloudinary mapping candidates:');
  if (apply) {
    await client.query('BEGIN');
  } else {
    await client.query('BEGIN READ ONLY');
  }
  inTransaction = true;
  const query = apply ? `${productQuery} FOR UPDATE OF p` : productQuery;
  const before = await client.query(query, [rowsToMap.map(row => row.id)]);
  assertMatchingProducts(before.rows);
  for (const proposed of rowsToMap) {
    const actual = before.rows.find(row => Number(row.id) === proposed.id);
    console.log(`  ${proposed.id} | ${actual.name} | ${actual.category} | ${actual.image === proposed.url ? 'already mapped' : 'candidate update'}`);
  }
  if (!apply) {
    await client.query('ROLLBACK');
    inTransaction = false;
    console.log('DRY RUN PASSED. 0 rows changed. Review mapping and obtain explicit approval before --apply.');
  } else {
    for (const proposed of rowsToMap) {
      const current = before.rows.find(row => Number(row.id) === proposed.id);
      if (current.image === proposed.url) continue;
      const updated = await client.query(
        `UPDATE products SET image = $1 WHERE id = $2 AND image IS NOT DISTINCT FROM $3 RETURNING id`,
        [proposed.url, proposed.id, current.image],
      );
      if (updated.rowCount !== 1) throw new Error(`Unexpected update count for product ${proposed.id}`);
    }
    const after = await client.query(productQuery, [rowsToMap.map(row => row.id)]);
    for (const proposed of rowsToMap) {
      const actual = after.rows.find(row => Number(row.id) === proposed.id);
      if (actual?.image !== proposed.url) throw new Error(`Verification failed for product ID ${proposed.id}`);
    }
    await client.query('COMMIT');
    inTransaction = false;
    console.log('SUCCESS: all 3 approved product image mappings verified in LOCAL DEVELOPMENT database.');
  }
} catch (error) {
  if (inTransaction) {
    try { await client.query('ROLLBACK'); } catch { /* best-effort rollback */ }
  }
  console.error(`FAILED CLOSED: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
