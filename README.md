
# Ecom Next.js (JS) + Tailwind + MongoDB + SMTP

## Quick start
1. `cp .env.example .env.local` and fill values.
2. `npm install`
3. `npm run seed` (creates master admin: admin@demo.com / admin123)
4. `npm run dev` → http://localhost:3000

## Admin login
- Email: admin@demo.com
- Password: admin123

## Email via Gmail SMTP (App Password)
1. In your Google Account → Security, enable **2-Step Verification**.
2. Go to **App passwords** → create one for Mail (any name).
3. Paste the 16‑character password into `.env.local` as `SMTP_PASS`.
4. Keep `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, and set `SMTP_USER` to your Gmail address.

## Notes
- Prices are **ex‑VAT (GBP)** in admin; storefront shows **inc‑VAT** in selected currency (GBP/EUR/USD).
- FX rates + shipping zone rates are editable in **Admin → Settings**.
- Checkout creates an order and sends a confirmation email via SMTP.
