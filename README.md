# LaptopHub PH — Laptop Rental Reservation System

A GitHub-ready web app for **LaptopHub PH** with:

- 10 laptop inventory
- Hourly reservation from **8:00 AM–5:00 PM**
- Customer-selected rental duration
- Live-style availability per laptop
- Overnight take-home rental **5:00 PM–8:00 AM**
- Overnight restriction: **18+ + valid ID type required**
- Cash or GCash payment selection
- Admin reservation dashboard
- Reservation status flow: Pending → Confirmed → Active → Completed
- Supabase/PostgreSQL schema with a database-level anti-overlap constraint
- Demo mode when Supabase environment variables are not configured
- LaptopHub PH poster/banner/logo assets included

## 1. Run locally

Install Node.js 20+.

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

If you do not configure Supabase, the app automatically runs in **Demo Mode** and stores bookings in the browser's localStorage. This is useful for testing the UI but is **not suitable for real multi-customer bookings**.

## 2. Connect Supabase for real bookings

Create a Supabase project, then open **SQL Editor** and run:

`supabase/schema.sql`

Then create `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Restart the dev server.

## 3. Important production security step

The included admin page is intentionally simple for a school/business prototype. Before public launch, add Supabase Auth and restrict admin operations to an authenticated admin role. Do not leave public booking data readable if you collect more customer information than necessary.

For a real launch, also consider:

- CAPTCHA / anti-spam
- GCash reference-number field and payment verification
- private ID-document storage if you decide to collect ID photos
- SMS/Viber confirmation
- cancellation and refund rules
- automatic daily/weekly reports

## Business defaults

- Hourly: **₱50/hour**
- Overnight: **₱500 default** in the frontend; change it to your actual business rate.
- Contact / GCash: **09628637697**
- Location: **Melvi Building, Jose Abad Santos Avenue, City of San Fernando, Pampanga**

## GitHub

Create a new GitHub repository, then:

```bash
git init
git add .
git commit -m "Initial LaptopHub reservation system"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## Deploy

The app can be deployed to Vercel, Netlify, Cloudflare Pages, or another Vite-compatible host. Add the two Supabase environment variables to the hosting provider.
