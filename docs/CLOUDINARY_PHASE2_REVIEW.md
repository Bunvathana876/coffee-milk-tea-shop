# Brew & Boba Café — Cloudinary Phase 2

**Status: prepared; no database updates performed by ChatGPT.**

## Verified context

- Cloudinary cloud `dr5o7ft6` contains the 20 expected drink images (checked using connected Cloudinary image inventory).
- Existing code stores images in `products.image` and the admin product route already supports editing the image URL.
- The Codex report of November 15, 2026 said the local development catalog has 18 products and none currently has a Cloudinary image URL. This report is **not** a live query from this session.
- The connected Neon project has **staging and production branches only**, with no dedicated development branch. Neither branch was queried for product data or modified during this phase.
- GitHub's branch `feature/brew-boba-rbac-updates` seed catalog contains the following matching product names. Local changes may differ, so the script rechecks ID/name/category before any update.

## Three proposed exact mappings (subject to user approval)

| Product ID | Product name | Category | Cloudinary asset | HTTPS URL |
|---:|---|---|---|---|
| 3 | Cappuccino | Coffee | `02_cappuccino` | https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704052/02_cappuccino.png |
| 4 | Caramel Macchiato | Coffee | `caramel_macchiato_with_caramel_lattice_foam_transparent` | https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704349/caramel_macchiato_with_caramel_lattice_foam_transparent.png |
| 16 | Iced Matcha Latte | Matcha | `08_iced_matcha_latte` | https://res.cloudinary.com/dr5o7ft6/image/upload/v1794704051/08_iced_matcha_latte.png |

All remaining products must stay unchanged until visually confirmed. For example, peach fruit tea should not automatically be assigned to peach oolong, and mango smoothie should not be assumed to contain coconut.

## Safety limits

- The script defaults to a **read-only** transaction and rollback.
- It requires environment `development`, database name `coffee_shop`, and localhost/127.0.0.1/::1 connectivity.
- It checks the ID, actual name, category, and existing image. A conflicting manual image stops the update.
- An apply must be approved separately and uses both a command-line flag and confirmation environment variable.
- When applying, it updates ONLY `products.image` for these 3 products, in one transaction, and re-reads all 3 before commit.
- No migration, payment, customer, price, category or availability changes are made.
- **Note:** localhost may be an SSH tunnel to a remote DB. Check the actual port forwarding and server identity before approving apply.

## What remains unverified

1. The current local development database's exact identity and live product rows (not remotely accessible in this ChatGPT session).
2. Whether the three images visually match the real drinks' recipe/presentation.
3. The final mobile and website rendering against the updated local API.
4. Clean tests and staging/production deployment after actual local work (not attempted here).

## Next steps

1. Copy `backend/scripts/cloudinary-phase2.mjs` to your existing repo's `backend/scripts/` folder.
2. Run the read-only dry-run: `cd backend && node scripts/cloudinary-phase2.mjs --dry-run`.
3. Review the output and visually approve the three matching images. **Do not run --apply yet.**
4. After explicit approval and verifying that port targets your actual local DB, apply only those 3 mappings with the separately gated command in the package README.
5. Re-query products, restart/refetch your local Flutter and website app, check images, and run tests.
