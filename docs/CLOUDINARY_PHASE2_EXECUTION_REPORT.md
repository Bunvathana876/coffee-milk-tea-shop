# Cloudinary Phase 2 — local execution report

Date: 2026-11-15. **Approval received for IDs 3, 4, and 16 on `localhost:5433/coffee_shop`. Applied successfully; exactly three `products.image` values changed.**

## Verified target

- `backend/.env` resolves to `ENVIRONMENT=development` and PostgreSQL `coffee_shop` on `localhost:5433`. No credential or complete connection string was printed.
- The listening process for loopback port 5433 is the local Homebrew PostgreSQL executable (`/opt/homebrew/opt/postgresql@18/bin/postgres`), not an SSH tunnel or Docker port proxy. The server reported PostgreSQL 18.6, database `coffee_shop`, address `::1/128`, port 5433.
- A pre-apply `BEGIN READ ONLY` query found 18 products and zero stored Cloudinary URLs. The three approved rows were available and had the exact expected Unsplash URLs. A post-apply read found 18 products and exactly three stored Cloudinary URLs.
- No Neon staging or production connection was made.

## Exact approved and applied changes

The before URL is the exact pre-apply value read from local PostgreSQL. The after URL was read back from the same database after the transaction committed.

| Product ID | Product / category | Before image | After image | Check |
|---:|---|---|---|---|
| 3 | Cappuccino / Coffee | https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80 | https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704052/02_cappuccino.png | Name/category match; hot foamed coffee in Brew & Boba mug |
| 4 | Caramel Macchiato / Coffee | https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80 | https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704349/caramel_macchiato_with_caramel_lattice_foam_transparent.png | Name/category match; layered milk and coffee with caramel lattice foam |
| 16 | Iced Matcha Latte / Matcha | https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80 | https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/08_iced_matcha_latte.png | Name/category match; iced green matcha and milk in lidded cup |

The Cloudinary asset API returned these exact `secure_url` values for the three public IDs. All three downloaded successfully as 1254 × 1254 RGBA PNG files. Visual inspection found no product identity mismatch. Pixel checks found alpha 0 at outer background samples for all three. The caramel PNG contains peach RGB color in fully transparent pixels, which can look like a background in a viewer that ignores alpha; 60.7% of its pixels have alpha 0, so this is not an opaque background in alpha-aware clients.

## Script result

Command: `cd backend && node scripts/cloudinary-phase2.mjs --dry-run` (via the project RTK wrapper).

```text
Mode: READ-ONLY DRY RUN
Database: coffee_shop | Config host: localhost | Server address: ::1/128 | Port: 5433
Cloudinary mapping candidates:
  3 | Cappuccino | Coffee | candidate update
  4 | Caramel Macchiato | Coffee | candidate update
  16 | Iced Matcha Latte | Matcha | candidate update
DRY RUN PASSED. 0 rows changed. Review mapping and obtain explicit approval before --apply.
```

Exit code: 0. The dry-run path uses `BEGIN READ ONLY` and `ROLLBACK`. Before applying, the script was tightened to require the exact approved prior image values, `localhost:5433`, the `coffee_shop` database, and a loopback server address inside its transaction. The updated dry run passed again with zero rows changed.

## Apply transaction and database verification

The existing guarded Phase 2 script was run with `--apply` and its required local confirmation environment variable. It began a transaction, locked the three target product rows, checked ID/name/category/exact old image, updated only `products.image` with parameterized SQL, read back all three new URLs, and committed. Exit code: 0. The script reported success for IDs 3, 4, and 16. No retry or second apply was run.

Pre-apply and post-apply SHA-256 fingerprints were computed from ordered product rows using read-only queries:

| Invariant | Before and after result |
|---|---|
| Total products | 18 → 18 |
| Rows with a Cloudinary URL | 0 → 3 |
| All 15 other product rows, including their images | Identical fingerprint: `cfee532b7c64b73a92b7a2b4027aed92a7042dac68eefa73290aadcca5e50923` |
| All non-image fields for IDs 3, 4, 16 | Identical fingerprint: `c3f57f9443cad8f1d9fbaf87d8e7eb11e7e412726db0901826163cc1d4647720` |
| Three target URLs | Exact approved Cloudinary URLs verified after apply and again after testing |

Names, categories, prices, availability, product IDs, and all other product records remained unchanged. No products were created or deleted.

## API and client checks

- A temporary instance of this backend read the local development database. `GET /api/products` returned 18 products with the three new URLs; `GET /api/products/3`, `/4`, and `/16` each returned the corresponding exact URL.
- An authenticated, read-only `GET /api/admin/products` call returned all 18 products with the same three image URLs. The short-lived test token was kept in process memory and was not printed.
- The customer website and management portal image URL helpers generated their Cloudinary thumbnails for all three products. All six derived URLs returned HTTP 200 with `image/png`.
- The Flutter image URL helper generated 320 px card and 800 px detail derivatives for all three products. All six URLs returned HTTP 200 with `image/png`.
- No screenshots were captured. A live browser or device visual layout review was not performed; these checks verify API data, generated image URLs, delivery, compilation, and widget tests.
- Local port 8001, the default API URL in the customer website and Flutter configuration, was occupied by an unrelated Python/Uvicorn service during this run. The café backend was tested on a temporary ephemeral port and then closed. A manual live-client review needs the café backend on a reachable port and client API URLs pointed to it; no unrelated process or container was stopped.

## Tests and builds

| Check | Result |
|---|---|
| Backend `npm test` | 124 passed, 0 failed; isolated in-memory test database |
| Flutter `flutter analyze` | No issues |
| Flutter `flutter test` | All tests passed |
| Customer frontend `npm test` | Passed |
| Customer frontend `npm run build` | Passed |
| Management portal `npm run build` | Passed |
| Management portal `npm test` | 82 passed, 1 failed in the pre-existing untracked light-mode test because Node 24 exposed a `localStorage` object without `setItem` |
| Management portal tests with `NODE_OPTIONS=--no-experimental-webstorage` | 83 passed, 0 failed; no test file was modified |

The only source change in this phase was stricter validation in `backend/scripts/cloudinary-phase2.mjs`. This report was updated. Existing uncommitted work was preserved. The other 15 products remain unmapped. No Neon staging or production database was accessed, and no commit, push, deployment, migration, or Cloudinary asset mutation was performed.
