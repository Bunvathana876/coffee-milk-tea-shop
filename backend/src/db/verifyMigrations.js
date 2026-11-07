import { migrationFiles } from '../../scripts/prepareMigrations.js';

export async function verifyMigrations(db) {
  const files = await migrationFiles();
  const result = await db.query('SELECT version, name, checksum FROM schema_migrations');
  for (const file of files) {
    const applied = result.rows.find(row => row.version === file.version);
    if (!applied || applied.name !== file.name || applied.checksum !== file.checksum) {
      throw new Error('Database migrations are missing or have changed. Run the approved migration process.');
    }
  }
  const trigger = await db.query(`SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'payment_settlements'::regclass
      AND tgname IN ('payment_audit_immutable', 'payment_audit_no_truncate') AND tgenabled = 'O'`);
  if (trigger.rowCount !== 2) throw new Error('Payment audit protection is missing or disabled.');
}
