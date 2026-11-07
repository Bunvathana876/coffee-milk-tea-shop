# Implementation plan

Current architecture: two React clients, Flutter, and one Express API share PostgreSQL. Development startup creates schema and seeds catalog/admin records. Existing order pricing, ownership and idempotency transactions must be preserved.

Confirmed gaps: cash settlement has no evidence ledger; production startup mutates schema and seeds accounts; migration runner lacks drift preflight; backups are untested; production images are development servers. Seller ownership and multi-store order assignment are absent.

Sequence: audited cash settlement and portal action; migration preflight and production startup checks; disposable PostgreSQL transaction/restore verification; production container preparation; client regressions and handoff. Seller transactions remain disabled until explicit store assignment and cart routing can be tested without reassigning historical data.

Validation: isolated API suites, PostgreSQL concurrency/rollback/immutability tests, repeat migration/checksum tests, restore rehearsal, both React builds, Flutter analysis/tests, Compose validation. No project database writes, deployment, or unique-work cleanup is authorized.
