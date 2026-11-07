# Backup and restore

Use a dedicated read-only backup identity and a protected environment for `BACKUP_DATABASE_URL`. No URL is printed or passed on the command line to PostgreSQL tools. Archive files are created with mode 0600 and exclusive creation; existing archives cannot be overwritten.

```sh
node backend/scripts/databaseBackup.js backup /secure/new-backup.dump
```

The archive is custom-format, without ownership/ACL restoration. Store it encrypted off-host, record a checksum and retention period, and run regular restore drills. A failed dump is incomplete and must not be used.

Restore tooling is intentionally restricted to an explicitly marked, empty loopback database named `phase5_restore_test` on a port other than 5432/5433:

```sh
RESTORE_DISPOSABLE=true node backend/scripts/databaseBackup.js restore-disposable /secure/new-backup.dump
```

Restore uses a single transaction and stops on errors. It never creates or resets a target database. Set `BACKUP_DATABASE_URL` through a protected environment to the new disposable target before this command. Inspect schema, row counts, references, audit records, and application behavior after restore. Reconcile backup point and write traffic before any actual recovery.

A disposable rehearsal successfully restored the settlement ledger into a second empty database. Existing native/Docker databases were not restored or modified. Production restoration requires explicit approval, an identified recovery point, a traffic freeze, and a separately reviewed target guard. Superusers and schema owners can bypass trigger protections; production application credentials must not own the schema or have trigger/DDL privileges.
