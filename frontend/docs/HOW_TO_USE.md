# Brew & Boba Café — Boy mascot brand kit

The generated artwork is an original visual concept for your café. This folder is **not** a complete React project.

## Installation into the existing repository

Extract this archive in the repository root `coffee-milk-tea-shop/` preserving folders.
Files will land at `frontend/public/brand/`.

Use in React/TSX:

```tsx
import { Link } from 'react-router-dom';

<Link to="/" aria-label="Brew & Boba Café home" className="brand-link">
  <img src="/brand/brew-boba-cup-icon.webp" alt="" width="48" height="48" />
  <span>brew & boba</span>
</Link>
```

For a hero or About section:

```tsx
<img
  src="/brand/brew-boba-primary.webp"
  alt="Brew & Boba Café mascot and logo"
  width="1200"
  height="800"
  className="brand-hero-art"
/>
```

For favicon in `frontend/index.html`:

```html
<link rel="icon" type="image/png" href="/brand/favicon-64.png" />
```

## Suggested usage

- `brew-boba-primary.webp`: homepage hero/large footer branding
- `brew-boba-mascot-badge.webp`: About page, footer, merchandise/sticker graphic
- `brew-boba-outline-badge.webp`: large editorial section or decorative stamp
- `brew-boba-cup-badge.webp`: callout sections, stickers, review visual treatment (no invented reviews)
- `brew-boba-cup-icon.webp`: navbar icon, mobile menu, cards
- `favicon-64.png`: browser favicon

Both PNG and WebP are provided. WebP assets will usually load faster. PNG assets retain compatibility for editing/sharing.
Use only one file format per appearance on the page.

## Colors

Cream: #FFF8DF (brand imagery background pairing)
Cobalt: #1345A3 (approximation; refine with sampled logo color if needed)
Dark ink: #17294D
Muted yellow: #F5E4AD

## Safety

Only edit `frontend/`. Leave `backend/`, `management-portal/`, `mobile_app/`, migrations, API calls, auth, checkout and payment logic unchanged.
Use your existing GitHub repo and Vercel customer storefront, not a new unrelated deployment.
The PNGs are raster images, not editable SVG source artwork. Use alt text on meaningful branding; decorative icons can use `alt=""`.
