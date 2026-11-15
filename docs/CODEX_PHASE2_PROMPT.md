# Codex — Brew & Boba Café Cloudinary Phase 2

Work in `/Users/bunvathana/Documents/Code/Project/coffee-milk-tea-shop`.

Goal: verify and prepare the THREE proposed Cloudinary product-image mappings in the **local development** database only. Do not write staging or production, and do not push or deploy.

1. Read AGENTS.md, `docs/CLOUDINARY_PRODUCT_IMAGE_INTEGRATION_REPORT.md`, `docs/CLOUDINARY_PHASE2_REVIEW.md` and `backend/scripts/cloudinary-phase2.mjs`.
2. Preserve all uncommitted work and do not modify code unrelated to Cloudinary image mapping.
3. Confirm `backend/.env` selects development, local PostgreSQL `coffee_shop`, and verify the local port is not tunneled to a cloud database. Do not print passwords, credentials, or complete connection strings.
4. Inspect current product IDs, names, categories, and images with read-only SQL. Compare against the three exact candidates: 3 Cappuccino, 4 Caramel Macchiato, 16 Iced Matcha Latte. Validate all 3 HTTPS Cloudinary URLs and image contents.
5. Run `cd backend && node scripts/cloudinary-phase2.mjs --dry-run`. Report existing URLs, proposed URLs, and any conflict.
6. STOP BEFORE ANY MUTATION. Ask for explicit approval of the exact three mappings and exact local database target. The user's request to prepare Phase 2 is not automatic authorization to overwrite product image records.
7. After separate approval, run the protected --apply script against verified local PostgreSQL only. Its SQL must update only products.image and verify the result in one transaction. Do not modify names, categories, prices, or product availability.
8. Re-query the local database, check the backend GET product response, Flutter Home/Menu/Drink Details/Cart image rendering, website product cards and product details, and management portal product previews. If no client is reachable, report unverified rather than assuming success.
9. Run backend, frontend, management-portal tests and builds, plus `flutter analyze` and `flutter test`; investigate failures without disabling tests or modifying business logic.
10. Summarize results in `docs/CLOUDINARY_PHASE2_EXECUTION_REPORT.md` with before/after, row counts, all failures, approval status, and remaining unmapped products.

Never change Neon staging or production, never run cloud migrations, never upload/rename/delete Cloudinary assets, and never commit, push, deploy or take screenshots automatically.
