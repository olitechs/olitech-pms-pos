# AGENTS.md

## Project Context

OliTechs PMS + POS is a standalone Hotel Property Management System and
Point of Sale application. It was originally scaffolded on the Base44
platform; that dependency has been fully removed — the app now runs as a
plain Vite + React app with no external platform requirement.

Start with `README.md` for local setup and environment variables.

## Key Files

- `src/`: frontend application source (Vite root).
- `src/services/authService.js`: platform-independent auth layer (local,
  browser-stored for now — swap this file for a real backend later).
- `src/lib/AuthContext.jsx`: React auth context consumed by `App.jsx` /
  `ProtectedRoute.jsx`.
- `src/data/AppStore.jsx`, `src/data/PmsStore.jsx`: local in-memory state for
  the POS floor/table sessions and PMS rooms/reservations, respectively.
  Replace with real API calls when a backend is connected.
- `vite.config.js`: standard Vite + React config (no platform plugin).

## Working Notes

- `npm install`, `npm run dev`, `npm run build` are the standard commands —
  no external CLI or hosted backend is required.
- The app boots and is usable entirely offline; data resets on page reload
  except for the auth session, which persists via `localStorage`.
- Run the relevant checks from `package.json` (`npm run lint`, `npm run build`)
  before finishing code changes.
