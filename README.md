# Nook (LifeLine Frontend)

React + Vite frontend for Nook, a workspace booking app. Employees explore offices and book desks/rooms; managers create and edit spaces, see all bookings and view occupancy. Bookings and cancellations by other users appear live via SignalR.

Backend: [LifeLine_Backend](https://github.com/Samuel1796/LifeLine_Backend)

## Stack

- React 18, React Router 6
- Vite 5
- `@microsoft/signalr` for live updates

## Running locally

Requirements: Node.js 18+ and the backend running (by default on `http://localhost:5000`).

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173`, which is the backend's default allowed CORS origin.

To point at a different API, copy `.env.example` to `.env` and set:

```
VITE_API_URL=https://your-backend.onrender.com
```

No trailing slash. If unset it defaults to `http://localhost:5000`.

### Demo accounts

All seeded users have the password `Password123!`. Use `manager@demo.com` for the Manager role, or `ama@demo.com` for an Employee.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Deploying to Vercel

1. Import the repo; Vercel detects Vite (build `npm run build`, output `dist`).
2. Set `VITE_API_URL` to the backend URL under Project Settings → Environment Variables. It is baked in at build time, so redeploy after changing it.
3. `vercel.json` rewrites all paths to `index.html` so client-side routes work on refresh.
4. Add the Vercel URL (e.g. `https://your-app.vercel.app`) to the backend's `FRONTEND_ORIGINS`. **If the Vercel domain changes, update it there too**, or API calls will fail with CORS errors.

## Routes

| Path | Page |
|---|---|
| `/` | Landing |
| `/login`, `/register` | Auth |
| `/spaces` | Explore and book spaces |
| `/bookings` | My bookings |
| `/manage` | Manager dashboard |

## Project layout

```
src/
  pages/        Route pages
  components/   Drawers, navbar, skeletons, live updates
  api.js        Fetch wrapper (reads VITE_API_URL)
  AuthContext.jsx, ToastContext.jsx
  useNotifications.js, echo.js   SignalR connection and own-action de-duplication
  time.js       UTC/local time helpers
```
