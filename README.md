# OliTechs PMS + POS

A standalone Hotel Property Management System (PMS) and Point of Sale (POS)
application. Runs entirely on its own — no external platform, hosted
backend, or account is required to develop or build it.

## Prerequisites

- Node.js 18+
- npm

## Run Locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview   # optional: preview the production build locally
```

## Current Data Layer

This is a working, fully-clickable app, but its data currently lives in the
browser rather than a real database:

- **Auth** (`src/services/authService.js`): accounts are stored in
  `localStorage` with a hashed password. This is meant to let the app run
  standalone during development — it is **not** production-grade security.
  Register a new account on first run; the first account created becomes
  the Administrator.
- **POS floor/table sessions & printers** (`src/data/AppStore.jsx`) and
  **PMS rooms/reservations** (`src/data/PmsStore.jsx`): local React state,
  seeded with sample data, reset on page reload.
- **Dashboard/report figures, kitchen queue, guest directory**
  (`src/data/platformData.js`): static sample data.

To connect a real backend, replace the calls inside `src/services/*` and the
two `*Store.jsx` providers — the rest of the app (components, routing, UI)
does not need to change.

## Project Structure

```
src/
  components/   shared UI, POS screens, PMS screens, shell (sidebar/topbar), admin
  pages/        routed pages (Login, Register, POSApp, ...)
  lib/          auth context, utilities, query client
  services/     platform-independent service layer (auth today; add more here)
  data/         local state providers + sample data + design tokens (palette.js)
  hooks/        shared hooks
```

### Admin dashboard reliability

The platform dashboard derives property counts from the same `admin_list_properties()` RPC used by the Properties page. This avoids a hard dependency on PostgREST exposing `admin_dashboard_stats()` in its schema cache. The database RPC remains available for compatibility with older clients.


## Supabase migrations
Run `0013_room_planner_schema_repair.sql` after the existing PMS migrations. It repairs missing room setup tables/columns and reloads the PostgREST schema cache.
