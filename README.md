# ABIRA Enterprises Invoice Generator

A hosted, single-account invoice application for ABIRA Enterprises. Next.js runs on Vercel, with Supabase Auth, Postgres, and private Storage for persistent data. The application has one shared password, no roles, and no public sign-up flow.

## Features

- Shared-password sign-in through one fixed Supabase Auth account; password changes apply to the shared account.
- Create, search, filter, sort, edit, duplicate, print, download, and permanently delete invoices.
- Supabase stores customers, products, invoices, invoice items, and business settings. Dashboard counts are calculated from those records.
- Invoice customer, shipping, and business snapshots preserve historical invoice details.
- Private Supabase Storage for logo and payment QR images.
- Responsive dashboard and A4 PDF generation.
- No payment tracking, gateway, subscription, or service-role key in the application.

## Technologies

- Next.js 16 App Router, React, TypeScript, and Tailwind CSS.
- Supabase Auth, Postgres with Row Level Security, and private Storage.
- `@react-pdf/renderer` for PDF preview, download, and print.

## Project structure

```text
src/
  app/
    (dashboard)/         Invoice, customer, product, dashboard, and settings pages
    api/                 Authenticated data, auth, and asset APIs
    login/               Shared-password sign-in
  components/            Forms, responsive navigation, and PDF components
  lib/
    supabase/            Server client, RLS-aware store, and database types
    invoice-validation.ts Server-side invoice validation
    constants/            Brochure product catalogue
supabase/
  migrations/             Database, RLS, invoice RPC, and Storage setup
tests/                    Invoice and asset validation tests
```

## Supabase setup

Use the existing Supabase project or a new one:

1. In Supabase **Authentication → Users**, keep or create exactly one account for the app. Set its email to the value you will use for `SUPABASE_AUTH_EMAIL`, and set the shared password there. The app login asks only for the password.
2. Disable public sign-ups in Supabase Auth settings. Do not create additional app accounts; there are no roles.
3. Apply [`20261119000000_invoice_app.sql`](./supabase/migrations/20261119000000_invoice_app.sql) in the Supabase SQL Editor. It creates or upgrades the app tables, assigns existing Supabase rows to the single Auth user, enables owner-scoped RLS, creates the atomic invoice-save function, and configures the private `abira-business-assets` bucket. This new bucket leaves any older public asset bucket and its existing invoice URLs unchanged.
   - The migration stops unless exactly one Supabase Auth user exists. It does not delete existing Supabase invoice/customer/product rows.
   - The local SQLite database is deliberately **not** imported. It remains on the PC under `data/`, which is ignored by Git.
4. Copy `.env.example` to `.env.local` and fill in the project URL, anon/publishable key, and the exact fixed Auth email. Never put a service-role key in the app or expose it to the browser; this app does not need one.
5. On first authenticated use, the app creates the business profile if missing and synchronizes the included catalogue without replacing existing product IDs.

The anon/publishable key is intended for app use; RLS restricts database and Storage access to the authenticated owner. All database access goes through server-side routes. Supabase Auth handles password hashing, session cookies, and sign-in rate limits.

## Local development

Use Node.js 22 or newer:

```powershell
npm ci
Copy-Item .env.example .env.local
# Edit .env.local with the Supabase values above.
npm run dev
```

Open `http://127.0.0.1:3000`. For local development, the application still needs the configured Supabase project and network access. The old local SQLite records are not shown in the hosted database.

## Vercel deployment

1. Import `vivekrawt/invoice_generator` into Vercel and select the `main` branch.
2. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_AUTH_EMAIL` to Vercel’s Production Environment Variables. Do not prefix these server-only variables with `NEXT_PUBLIC_`. For Preview deployments, use a separate Supabase project and Auth account; do not point previews at production data.
3. Deploy with the default Next.js framework settings (`npm ci` and `npm run build`).
4. Open the deployed site, sign in with the shared password, and verify settings, products, contacts, invoices, PDF preview/download, and uploads.

Vercel’s filesystem is temporary, so no database or uploaded file is stored on the Vercel instance. Supabase is the persistent backend.

### Hosting plan and free-tier limits

Supabase Free currently includes 500 MB database storage, 1 GB file storage, 5 GB uncached egress, 5 GB cached egress, and 50,000 monthly active users. Free projects may be paused after one week of inactivity and the plan is limited to two active projects. That means the first request after inactivity may require resuming the project. Review the [current Supabase pricing and quotas](https://supabase.com/pricing) before launch.

Vercel Hobby is free but its current Terms of Service limit it to personal or non-commercial use. Since this application creates ABIRA business invoices, use Vercel Pro or a host whose plan permits commercial use; do not deploy this business workload on Hobby. Vercel quotas and overage behavior vary by plan and can change; see the [Hobby plan limits](https://vercel.com/docs/plans/hobby), [fair-use guidelines](https://vercel.com/docs/limits/fair-use-guidelines), and [Terms of Service](https://vercel.com/legal/terms#hobby-plan).

## Validation and tests

```powershell
npm test
npm run lint
npm run build
```

Automated tests cover invoice financial-year and amount-in-words helpers, invoice input validation, and image type/signature checks. Authenticated database and Storage integration tests require valid Supabase configuration and should be exercised against the target project before production use.

## Security and operations

- Keep the Supabase project restricted to the single app account, and keep public sign-ups disabled.
- Every app table has RLS enabled and is scoped to the authenticated user. The Storage bucket is private and owner-scoped.
- The app validates invoice inputs on the server and saves invoices/items in one database transaction.
- Removing or replacing a logo/QR changes the current business profile but retains old private image objects so historical invoice snapshots keep rendering.
- Password recovery is managed through the Supabase Auth dashboard. Changing the password in Settings updates the single shared Auth account.
- Back up Supabase data and Storage separately. The local `data/` folder is not a cloud backup.

## Limitations

- This is a single shared-password application, not a multi-user or role-based system.
- The local SQLite database was intentionally not migrated. It remains a separate backup on the original PC.
- Automated tests do not replace end-to-end testing against the configured Supabase project; PDF printing and hosted browser workflows require manual verification.
