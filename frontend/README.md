# City Services AI Platform — Frontend

Professional SaaS-style frontend for the City Services AI Platform: super admin panel, business owner cabinet, and public marketplace. All user-visible strings are in **Uzbek**. The app talks to a **Django REST** backend via JWT.

## Tech stack

- React 18 + Vite 7 (JavaScript)
- Ant Design 5, React Router 7, Axios, Recharts, Lucide React
- Global and modular CSS (no Tailwind)

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Environment

Copy `.env.example` to `.env` and adjust:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_TELEGRAM_BOT_URL=https://t.me/your_bot
```

Axios uses `baseURL = ${VITE_API_BASE_URL}/api`.

## Authentication

- Login: `POST /api/auth/login/` with `username` and `password`.
- Tokens are stored as `access` and `refresh` in `localStorage`.
- Axios sends `Authorization: Bearer <access>`.
- If there is no token, protected routes redirect to `/login`.
- On `401`, the client clears the session and redirects to `/login`.

After login, the app loads `/api/auth/me/` and routes by role:

- `super_admin` → `/admin/dashboard`
- `business_owner` / `manager` → `/business/select`

## Backend connection

1. Start the Django API on the same host/port as `VITE_API_BASE_URL` (default `http://localhost:8000`).
2. Ensure CORS allows your Vite origin (e.g. `http://localhost:5173`).

## Folder structure (main)

- `src/routes/` — routing, `ProtectedRoute`, `RoleRoute`
- `src/layouts/` — auth, admin, business, public shells
- `src/pages/` — feature pages (admin, business, public, auth)
- `src/components/` — layout, UI, cards, charts, dynamic forms
- `src/services/` — API modules (`api.js` + resource services)
- `src/config/` — business types, statuses, plans, field configs
- `src/utils/` — `normalizeList`, formatters, storage, permissions
List endpoints may return DRF pagination `{ count, next, previous, results }`. Services use `normalizeList` so pages always receive an array.

## Troubleshooting

**CORS error in the browser**  
Configure the backend to allow the frontend origin and required headers/methods.

**401 after login**  
Check that the access token is returned and stored, JWT settings match (algorithm, header), and the clock is correct.

**Data not updating after save**  
Pages refetch after mutations and listen for `business-changed` / `cs-business-data-changed` so lists and the dashboard stay in sync across screens.

**Wrong API URL**  
Verify `VITE_API_BASE_URL` (no trailing slash required) and restart `npm run dev` after changing `.env`.

## Build

```bash
npm run build
npm run preview
```
