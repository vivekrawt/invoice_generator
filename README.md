# ABIRA Enterprises Invoice Generator

A single-PC invoice application for ABIRA Enterprises. It runs only on `127.0.0.1`, uses a local SQLite database and local image files, and does not require Supabase, hosting, or a network account. Invoices are real saved records; PDFs are generated with `@react-pdf/renderer`. There is no payment tracking or payment gateway.

## Features

- Local password setup, sign-in, and password change; protected dashboard and data APIs.
- Create, search, filter, sort, edit, duplicate, print, download, and permanently delete invoices.
- Invoice, customer, business, and shipping snapshots preserve historical invoice details.
- Customer and product create/edit/delete; initial product catalogue is seeded from the included brochure.
- Business profile, bank details, terms, logo, and QR settings.
- PNG, JPEG, and WebP uploads (up to 2 MiB) are stored in the local data directory.
- Responsive dashboard and A4 PDF generation.

## Technologies

- Next.js 14 App Router, React 18, TypeScript, and Tailwind CSS.
- SQLite via `better-sqlite3`; password hashes use Node.js `scrypt`.
- `@react-pdf/renderer` for PDF preview, download, and print.
- No paid services or cloud integrations.

## Project structure

```text
src/
  app/
    (dashboard)/         Invoice, customer, product, dashboard, and settings pages
    api/                 Authenticated local data and asset APIs
    login/               First-run password setup and sign-in
  components/            Forms, responsive navigation, and PDF components
  lib/
    local/               SQLite schema/store, local sessions, and API helpers
    constants/           Invoice defaults and brochure product catalogue
    number-to-words.ts   Indian currency and financial-year helpers
tests/                   Invoice utility and isolated SQLite/authentication tests
data/                    Created on first run; SQLite database and uploaded assets
```

## Requirements and local setup

Use Windows with Node.js 22.6 or newer and npm.

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. On first use, set a local password (12–128 characters); there is no default password. Keep the password private. The server binds to loopback only and is not intended to be exposed to a LAN or the internet.

The application creates `data\abira-invoices.sqlite` and `data\assets\` automatically. To keep the database and uploaded files outside the project folder, set the optional `ABIRA_DATA_DIR` before starting Next.js:

```powershell
$env:ABIRA_DATA_DIR = "$env:USERPROFILE\Documents\ABIRA-Invoice-Data"
npm run dev
```

The same environment variable can be placed in an ignored `.env.local`. No environment variables are required for normal use; `.env.example` documents the optional data-directory override.

## Database and backups

SQLite tables are initialized automatically on first startup; no external database or manual migration command is required. The local schema stores the business profile, customers, products, invoices, invoice items, password credentials, sessions, and uploaded-asset metadata. Invoice items are deleted with their invoice; deleting a customer or product does not erase the invoice's saved snapshots or line descriptions.

To back up the application, stop the server and copy the entire data directory, including `abira-invoices.sqlite`, its SQLite journal/WAL files if present, and `assets\`. Restore by placing the copy back in the same data directory before starting the application. Do not copy only the main SQLite file while the app is running.

The password is an application login gate, not disk encryption. Protect the Windows account and the data directory with normal OS access controls. Anyone with direct access to the files can read or modify the database.

If you forget the password, stop the server and run this from the project folder to reset only the local login (invoices and settings remain):

```powershell
node -e "const Database=require('better-sqlite3'); const db=new Database('data/abira-invoices.sqlite'); db.prepare('DELETE FROM local_sessions').run(); db.prepare('DELETE FROM local_credentials').run(); db.close();"
```

If `ABIRA_DATA_DIR` points elsewhere, replace the database path in that command with `<ABIRA_DATA_DIR>\abira-invoices.sqlite`. Start the app again and set a new password on the login screen.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `ABIRA_DATA_DIR` | No | Absolute path for the SQLite database and uploaded images. Defaults to `<project>\data`. |

No Supabase, Vercel, service-role, or public API keys are used.

## Tests and production build

```powershell
npm test
npm run lint
npm run build
npm start
```

`npm start` serves the production build on `127.0.0.1:3000`. Before release, also exercise the app manually:

- Create invoices with 1, 5, and 20 rows; omit GSTIN; set a separate shipping address; use custom products and manual prices.
- Check zero/negative quantities, invalid rates, duplicate invoice numbers, and dates before and after April 1.
- Edit and duplicate invoices; verify snapshots, invoice number uniqueness, and that duplicates do not overwrite originals.
- Create, edit, and delete customers and products; change business details and uploaded images.
- Verify A4 PDF business/customer details, item alignment, totals, QR, bank details, terms, multi-page layout, download, and print.
- Check dashboard, invoice tables, form, navigation, and PDF actions at desktop, tablet, and mobile widths.

Automated tests use a throwaway SQLite database and cover customer/product CRUD, invoice create/edit/delete, 1/5/20-row saves, number uniqueness, date/FY validation, snapshot retention, cascade deletion, amount-in-words calculation, and local password/session behavior.

## Limitations

- This is a local single-PC application; it has no cloud sync, remote backup, multi-user access, or hosted deployment configuration.
- Browser automation and long-form end-to-end database/PDF tests are not currently included; the manual checklist above requires verification on the target PC.
- SQLite and uploaded images are stored as ordinary local files and are not encrypted.
- Logo and QR image formats are restricted to PNG, JPEG, and WebP, with a 2 MiB per-file limit.
