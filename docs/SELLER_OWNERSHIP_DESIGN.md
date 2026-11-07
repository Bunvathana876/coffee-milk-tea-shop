# Seller implementation gate

Seller routes remain denied. No default owner or seller has been assigned to historical records.

Required model: stores with immutable unique IDs and active status; seller users distinct from staff administrators; memberships with unique `(seller_id, store_id)` and active status; products linked to a store; orders carrying an immutable store assignment captured from the locked product rows. Every seller read/mutation must join current active membership and store status. Store IDs from request bodies cannot select ownership. Administrators assign memberships; sellers cannot alter identity roles or product/order ownership.

Before enabling transactions, define whether checkout rejects mixed-store carts or splits them into separately priced, idempotent orders. Current customer clients send no authoritative store ID and existing products/orders have no owner. Backfilling ownership or selecting a default store would invent relationships. Require a reviewed mapping and explicit customer contract before migration. Historical unassigned records remain administrator-only.

Validation required: disabled users/stores, membership revocation, cross-store reads and updates, unknown store IDs, role escalation, admin assignment audit, product/order FK constraints, mixed-cart behavior, and existing customer idempotency. None of these seller results are claimed in this implementation. Complete this foundation before replacing seller UI shells.
