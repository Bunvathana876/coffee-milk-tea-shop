# Payment policy — current cash reconciliation

Current implementation adds `POST /api/admin/orders/:id/cash-settlement`. An active administrator must explicitly confirm cash received and provide a receipt reference. Only unpaid cash orders at ready/completed may be settled. The order lock, unique order settlement, audit insert and paid update share one transaction. Repeated/concurrent claims are rejected. Actor ID, reference, server amount and timestamp are recorded. UPDATE, DELETE and TRUNCATE are blocked by triggers; production application credentials must not own or alter the schema. No correction/refund endpoint exists. Historical paid rows are preserved without invented evidence. KHQR remains unpaid.

The portal records a human cash observation, not bank verification. Audit reads require admin authorization. Deployment requires approved migration 002. The Phase 5 sections below are historical and superseded where they describe the absence of a cash ledger.

Updated: 2026-11-06. This is the implemented safety boundary and the required design for a future verified settlement workflow. The current application does **not** process a bank payment.

## Separate fields and evidence

| Concept | Current values | Meaning |
| --- | --- | --- |
| `order_status` | `pending`, `preparing`, `ready`, `completed`, `cancelled` | Café fulfillment only. `completed` is not evidence of payment. |
| `payment_method` | `cash`, `khqr` | Customer choice. `khqr` renders a synthetic demonstration QR. |
| `payment_status` | New orders are `unpaid`; historical rows may contain `pending`, `failed`, or `paid`. | Server-recorded state, distinct from fulfillment and method. |
| Payment verification | None for new orders. | No provider callback, bank confirmation, cash reconciliation ledger, or immutable evidence trail exists yet. |

The API ignores client-supplied prices and rejects client-supplied payment status. The web receipt, its PDF, Flutter tracking, and the management portal may display a server-recorded payment status, but none may infer `paid` from a QR view, scan, order placement, or fulfillment. The web receipt's local “simulate paid” control was removed. A historical `paid` row is a database record, not proof of an external transfer.

## Allowed operations now

- Order creation: authenticated customer submits `cash` or demo `khqr`; the server creates `payment_status = unpaid` and `order_status = pending` in the same order transaction. A matching idempotency retry returns that same order without another charge or loyalty credit.
- Fulfillment: an administrator may move `pending → preparing → ready → completed`; pending/preparing/ready may move to `cancelled` when payment is not recorded paid. Completed and cancelled are terminal. A cash order may be prepared and handed off while still recorded unpaid; operations must collect cash outside the app and must not describe the app as having verified it.
- Payment status: **no API transition is enabled**. `PATCH /api/admin/orders/:id/status` rejects `payment_status`, including repeated `paid` requests; ordinary staff and customers cannot change fulfillment or payment. Cancelling an old paid row is blocked until a verified refund process exists. No endpoint accepts bank credentials, transaction secrets, or a claimed scan result.
- Reporting: dashboard `total_sales_*` and report `total_revenue_*` include only rows recorded `paid` **and** `completed`. Gross order amounts in `status_breakdown.total_*` are not revenue. Unpaid, pending-payment, failed-payment, in-progress, and cancelled orders contribute zero recognized revenue. Historical paid rows must be reconciled before reports are used as financial evidence.

## Future manual cash reconciliation gate

Do not enable a `paid` transition merely by adding a button. A future implementation must require an active database-backed administrator, a specific order and `cash` method, an actual observed cash handoff, an explicit evidence/reference string, the actor ID, server timestamp, and an append-only audit row in the **same locked transaction** as the state change. A unique settlement key or order constraint must reject duplicate attempts, including concurrent requests. Updates and deletes of audit events must be denied to the application role. The UI must identify this as an administrator's cash observation, not proof of a bank transfer. Refunds and corrections need new compensating events; historical audit entries must remain immutable.

For real KHQR settlement, first choose a provider, verify credentials and webhook signature/replay rules, document supported status transitions and refunds, and test against its sandbox. No provider integration or credential is present in this phase.

## Test evidence and limits

Isolated HTTP tests cover cash and KHQR creation as unpaid, repeated denied settlement attempts, staff/customer denial, invalid fulfillment moves, cancelled and historical paid rows, and revenue rules. A disposable PostgreSQL migration test covers schema preparation, not payment processing. No real cash, bank, payment provider, or live order was settled.
