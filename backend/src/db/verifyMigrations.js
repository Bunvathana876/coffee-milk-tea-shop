import { migrationFiles } from '../../scripts/prepareMigrations.js';
import { DatabaseDiagnosticError } from './diagnostics.js';

export async function verifyMigrations(db) {
  const files = await migrationFiles();
  let result;
  try {
    result = await db.query('SELECT version, name, checksum FROM schema_migrations');
  } catch (err) {
    if (err.code === '42P01') {
      throw new DatabaseDiagnosticError(
        'DB_MIGRATION_TABLE_MISSING',
        'Database migration tracking table (schema_migrations) does not exist. Confirm the database target before running the approved migration process.',
        { cause: err },
      );
    }
    throw err;
  }
  for (const file of files) {
    const applied = result.rows.find(row => row.version === file.version);
    if (!applied) {
      throw new DatabaseDiagnosticError(
        'DB_MIGRATION_MISSING',
        `Migration ${file.version} (${file.name}) is missing. Confirm the database target and run the approved migration process.`,
      );
    }
    if (applied.name !== file.name) {
      throw new DatabaseDiagnosticError('DB_MIGRATION_NAME_MISMATCH',
        `Migration ${file.version} name mismatch. Compare the deployed migration inventory with the database ledger.`);
    }
    if (applied.checksum !== file.checksum) {
      throw new DatabaseDiagnosticError('DB_MIGRATION_CHECKSUM_MISMATCH',
        `Migration ${file.version} SHA-256 checksum mismatch. Restore the correct release artifacts; do not rewrite the migration ledger.`);
    }
  }
  const trigger = await db.query(`SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'payment_settlements'::regclass
      AND tgname IN ('payment_audit_immutable', 'payment_audit_no_truncate') AND tgenabled = 'O'`);
  if (trigger.rowCount !== 2) throw new DatabaseDiagnosticError('DB_AUDIT_TRIGGERS_MISSING',
    'Payment audit protection is missing or disabled. Both payment_audit_immutable and payment_audit_no_truncate must be enabled.');
}
