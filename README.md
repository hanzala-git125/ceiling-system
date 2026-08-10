# Ceiling System ERP Documentation

## Overview

The Ceiling System is a production and inventory management application built for a plate manufacturing factory. It tracks raw material inventory, production stages, waste, labour, sales, expenses, customer and supplier ledgers, and reporting.

This application is built as a hybrid React/Next.js project using TypeScript. The frontend uses a modern dashboard interface while the backend exposes API routes for database bootstrapping and persistence.

## Purpose

The app is designed to support a small manufacturing workshop by providing a complete ERP-like experience for:

- Raw material inventory management
- Production tracking across wet, dry, and final stages
- Automatic material consumption based on configurable formulas
- Waste tracking and breakage logging
- Expense and labour cost tracking
- Customer sales and invoicing
- Supplier purchase and payment ledgers
- Analytics and printable reporting

## Key Features

- User authentication with admin and staff roles
- Local cache + MongoDB bootstrap sync for offline fallback
- Inventory material creation, restocking, and unit conversion handling
- Production modules for wet, dry, and final plate manufacturing stages
- Formula settings that compute material consumption automatically
- Waste logging with wet/dry/manual source tracking
- Customer ledger entries and invoice generation
- Supplier ledger management and payment reconciliation
- Labour operator management, labour earnings, and payment balance tracking
- Profit and loss reporting across date ranges
- Print-ready invoice and report views
- Bilingual UI support for English and Urdu

## Tech Stack

- Frontend: React 18 + TypeScript
- Backend: Next.js API routes
- Bundler: Vite
- Styling: Tailwind CSS
- Icons: Lucide React
- Database ODM: Mongoose
- Storage: Browser `localStorage` plus MongoDB persistence
- Runtime: Node.js

## Libraries Used

- `react`
- `react-dom`
- `typescript`
- `vite`
- `next`
- `mongoose`
- `tailwindcss`
- `@tailwindcss/vite`
- `@tailwindcss/postcss`
- `autoprefixer`
- `lucide-react`
- `dotenv`

> Note: `@google/genai` is present in `package.json` but is not actively used in the current app source code.

## Repository Structure

- `src/`
  - `App.tsx` — main SPA shell and navigation logic
  - `main.tsx` — application entrypoint for React
  - `utils/api.ts` — client-side data storage, sync, helpers, and business logic
  - `utils/i18n.ts` — simple bilingual translation system
  - `types.ts` — shared TypeScript interfaces for domain models
  - `models/` — Mongoose schema definitions for database entities
  - `pages/` — React page views for all features
  - `components/` — shared layout and navigation components
- `pages/api/` — Next.js API endpoints for login, bootstrap, and save sync
- `lib/mongoose.ts` — MongoDB connection helper
- `vite.config.ts` — Vite build and plugin config
- `postcss.config.mjs` — Tailwind/PostCSS config
- `tsconfig.json` — TypeScript compiler settings

## Environment Setup

### Prerequisites

- Node.js (recommended v18+)
- MongoDB running locally or accessible remotely

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root, or set environment variables elsewhere. Supported variables:

- `MONGODB_URI` — MongoDB connection string (defaults to `mongodb://127.0.0.1:27017/platepro`)
- `ADMIN_USERNAME` — optional admin username (defaults to `admin`)
- `ADMIN_PASSWORD` — optional admin password (defaults to `admin`)
- `ADMIN_NAME` — optional display name for admin user

Example `.env.local`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/platepro
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
ADMIN_NAME=System Administrator
```

### Run Locally

```bash
npm run dev
```

Then open `http://localhost:3000`.

### Build for Production

```bash
npm run build
npm start
```

### Code Quality

```bash
npm run lint
```

## Authentication

The app uses a simple username/password login API at `/api/auth/login`.

Default credentials:

- Admin: `admin` / `admin` (or the values from `ADMIN_USERNAME` / `ADMIN_PASSWORD`)
- Staff: `factory` / `factory2026`

Admin and staff both can use the application, but admin credentials are intended for configuration and management.

## Data Flow

- On startup, the app requests `/api/bootstrap`.
- If MongoDB is available, the server returns saved collections and bootstraps `localStorage`.
- If the backend is unavailable, the app falls back to cached local data in the browser.
- Frontend changes persist in `localStorage` and are also POSTed to `/api/save` for backend sync.

## Main Screens and Usage

### Dashboard

The dashboard is the app home page. It provides:

- Today’s wet/dry/final production totals
- Current stock valuation
- Today’s sales and expenses summary
- Profit summary and activity feed
- Quick navigation to each module

### Inventory

Use the Inventory screen to:

- Add new raw materials
- Restock existing materials
- Manage special stock types like Panni and HD Paper
- View recent inventory transactions
- Automatically convert units using configured conversion factors

### Formula Settings

This screen defines how much raw material is consumed per finished plate.

- Create formulas for materials such as Plaster Paris, Maia, PVC Glue, Tape, Brown Paper, HD Paper, Panni, and Packaging
- Edit formula amounts and units
- Review formula change history
- Restore default formula values

### Wet Production

Record wet production batches and automatically deduct input materials from inventory.

- Enter molded wet plate totals
- Automatically compute plaster usage from formula settings
- Deduct material stock and log production records
- Associate labour operators and labour costs

### Dry Production

Track the drying stage with wet plates received and dry plates produced.

- Enter wet plates received from the wet stage
- Record dry plate output
- Track breakage/waste automatically as the difference
- Associate operators and labour costs for drying

### Final Production

Complete the product assembly stage and deduct final material usage.

- Enter dry plates received and final plates produced
- Preview formula-based material consumption before saving
- Deduct raw materials, Panni, and HD Paper stock automatically
- Generate waste records for remaining plate loss

### Waste Management

Track all production waste and breakage.

- View waste by source: wet, dry, or manual
- Add manual waste entries for corrections
- See daily, monthly, and cumulative loss metrics
- Log labour cost for waste handling

### Expenses

Record factory expenses and labour costs.

- Add expenses by category: Gas, Electricity, Labour, Transport, Other
- Use labour formula mode for production labour based on plate count
- Filter and search expense entries

### Labour

Manage operators and labour payment balances.

- Add operators by stage (wet, dry, final, waste)
- Track rate per plate and outstanding balances
- Record manual payments and clear balances
- View production totals across operator ledger entries

### Customers & Sales

Manage customer accounts and invoice sales.

- Add customers with contact details and opening balances
- Create sales invoices with invoice numbers, rate, quantity, discount, and total
- Save sales and add corresponding ledger entries automatically
- Search invoices by customer, invoice number, or date

### Suppliers

Manage suppliers, purchase records, and payments.

- Add supplier details and opening balances
- Track supplier materials and outstanding payables
- Add payments and keep the supplier ledger current

### Reports

View production, financial, and inventory reporting.

- Generate daily, weekly, monthly, or custom-range reports
- Review revenue, expenses, waste, labour cost, stock usage, and receivables
- Print a clean report layout

## Data Models

The application uses the following key models:

- `RawMaterial`
- `InventoryTransaction`
- `Formula`
- `FormulaHistory`
- `WetProduction`
- `DryProduction`
- `FinalProduction`
- `WasteRecord`
- `Expense`
- `Customer`
- `CustomerLedgerEntry`
- `Supplier`
- `SupplierLedgerEntry`
- `Sale`
- `Payment`
- `Operator`
- `LabourLedgerEntry`

Models are defined in `src/types.ts` and mirrored in the backend Mongoose schemas under `src/models/`.

## Example Workflow

### 1. Add raw materials

1. Go to Inventory.
2. Click "Add Material." Example:
   - Name: `Plaster Paris`
   - Unit: `kg`
   - Quantity: `50`
   - Cost per unit: `180`
   - Min threshold: `10`
3. Save.

### 2. Define production formulas

1. Go to Formula Settings.
2. Add a formula for `Plaster Paris`:
   - Amount: `25`
   - Unit: `kg`
3. Save.

### 3. Record wet production

1. Go to Wet Production.
2. Enter production date and plates produced, e.g. `1000`.
3. Save. The system deducts `25 kg` of `Plaster Paris` automatically.

### 4. Record dry production

1. Go to Dry Production.
2. Enter wet plates received and final dry plates produced, e.g. received `1000`, produced `980`.
3. Save. Waste of `20` plates is logged automatically.

### 5. Record final production

1. Go to Final Production.
2. Enter dry plates received and final plates produced, e.g. received `980`, produced `940`.
3. Select Panni and HD Paper types if used.
4. Save. Material consumption is deducted based on formulas.

### 6. Create a customer invoice

1. Go to Sales.
2. Select an existing customer or add a new customer.
3. Enter product type, quantity, rate, discount, and save.
4. The system creates a ledger entry and invoice record.

### 7. Review reports

1. Go to Reports.
2. Choose a date range.
3. Review revenue, expenses, waste, and profit metrics.
4. Print or export using the browser print dialog.

## Manual Testing Guide

Use these checks to validate the app:

- Log in with admin and staff credentials.
- Add inventory items and confirm they appear in stock lists.
- Change formula settings and verify final production uses the updated consumption values.
- Create a wet batch and confirm material deduction in inventory.
- Create dry and final production entries and ensure waste is logged.
- Add expenses and labour records, then verify totals in Reports.
- Add a sale and confirm invoice appears in Sales and customer ledger balance updates.
- Add a supplier, record a payment, and confirm supplier ledger balance updates.
- Disconnect MongoDB and reload the app to confirm local cache fallback works.

## Troubleshooting

- If the app cannot connect to MongoDB, it will still load using cached local data.
- Ensure `MONGODB_URI` is correctly set and MongoDB is reachable.
- Use browser dev tools to inspect `localStorage` keys prefixed with `factory_erp_`.
- If authentication fails, verify the credentials and environment variables.

## Notes

- The frontend and backend are tightly coupled through Next.js API endpoints and the browser local storage sync layer.
- The system is designed for offline-friendly use in environments with intermittent backend connectivity.
- The app uses `localStorage` as the primary runtime persistence mechanism in the browser.

---

For changes to business rules or formulas, update `src/pages/FormulaSettings.tsx` and the production page logic in `src/pages/FinalProduction.tsx`, `src/pages/WetProduction.tsx`, and `src/pages/DryProduction.tsx`.
