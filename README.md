# SQMS – Smart Mess Queue Management System

A digital token-based queue system for a college mess. Students book a token from their phone, track their live position and estimated wait, and get alerted when their turn approaches. Mess staff run the queue from a counter console, and administrators manage counters, meals, menus, staff and reports.

> Version 1 covers **college mess management only**.

---

## Features

| Role | What they can do |
|------|------------------|
| **Student** | View today's menu · pick a meal session and counter · generate a token · track live queue position, now-serving token and estimated wait · get in-app alerts (token generated, turn approaching, called/recalled, served, skipped, cancelled) · cancel a waiting token · view token history |
| **Mess staff** | Pick a counter and meal session · live queue table with search and status filters · **Call next**, **Recall**, **Mark served**, **Skip** · **Pause/Resume** new tokens · activity log of every queue action |
| **Administrator** | Live overview with charts · create/edit/activate/deactivate counters · meal timings and active status · queue settings (default service time, alert threshold, enforce timings) · menu items by date and meal (add/edit/delete/copy a day) · staff accounts (create/edit/activate/deactivate) · student directory · reports with date/counter/meal filters and **CSV export** |

### How the queue works

- **Token numbers** are sequential per counter, meal session and day (`A-001`, `A-002`, …).
- **Queue position** is counted from real `WAITING` tokens in the database.
- **Estimated wait** = tokens ahead (+1 if someone is at the counter) × seconds per token. Seconds per token is **observed** from the gaps between recent calls at that counter today (once there are 3+ samples), otherwise the counter's or mess's **configured** service time.
- **Turn-approaching alert** is sent once per token when `approachThreshold` (default 3) or fewer tokens are ahead.
- **Only one token can be called per counter queue** at a time; staff must serve or skip it before calling the next.
- **Valid transitions only**: `WAITING → CALLED | SKIPPED | CANCELLED`, `CALLED → SERVED | SKIPPED`. Anything else is rejected with `409`.
- **Concurrency**: token generation runs in a transaction behind a per-queue lock, and the database enforces uniqueness on token numbers, on one active token per student per queue (`activeKey`), and on one called token per queue (`calledKey`).
- **Live updates**: Server-Sent Events (`/api/events`) push queue, counter, menu and notification changes; every page also polls as a fallback.
- Every staff and student queue action is written to `QueueEvent`.

Notifications are **in-app only** (with live push to open browser tabs). SMS, WhatsApp and mobile push are not integrated.

---

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide icons
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, Zod validation
- **Database:** SQLite (file `server/prisma/dev.db`)
- **Auth:** bcrypt password hashing, JWT in an http-only `SameSite=Lax` cookie, role-based route guards on both API and UI, login rate limiting

---

## Getting started

**Requirements:** Node.js 18 or newer (tested on Node 24) and npm. No paid services are needed.

```bash
cd SQMS
npm run setup
```

This installs root, server and client dependencies, creates the SQLite database, and seeds demo data.

Then start both apps:

```bash
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:4000/api

To run them separately, use `npm --prefix server run dev` and `npm --prefix client run dev` in two terminals.

### Reset demo data

The seed builds today's live queue around the **current meal session**, so re-seed right before a demo:

```bash
npm run seed
```

It is safe to run while the API is running.

### Configuration

`server/.env` (copied from `server/.env.example`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `file:./dev.db` | SQLite file |
| `PORT` | `4000` | API port |
| `JWT_SECRET` | — | **Change this** to a long random string outside of local development |
| `JWT_EXPIRES_IN` | `7d` | Session length |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed origin if the client is hosted separately |

---

## Deployment (Vercel + Render)

The frontend is a static Vite app on **Vercel**. The Express API and SQLite database run on **Render**. Vercel forwards `/api/*` to Render (`client/vercel.json`), so the browser sees a single origin and session cookies work.

1. **API on Render:** in Render, choose **New → Blueprint**, connect this repo, and apply `render.yaml`. It creates the free web service `sqms-api-purvesh597` and generates `JWT_SECRET`. When it's live, check `https://sqms-api-purvesh597.onrender.com/api/health`.
2. **Frontend on Vercel:** set the project's **Root Directory** to `client` (framework preset: Vite). `client/vercel.json` adds the `/api` proxy and the single-page-app fallback, so routes such as `/student` work when the page is refreshed.
3. If Render gives the service a different URL, update the `destination` in `client/vercel.json` and push.

Free-tier notes: the Render service sleeps after 15 minutes without traffic, and the first request after that takes about 50 seconds. The database is re-created and **re-seeded on every start**, so open the site a minute before a demo to wake it up and get fresh data. The server runs in `Asia/Kolkata` time (`TZ` in `render.yaml`) so meal timings match the college clock.

---

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Administrator | `admin@sqms.edu` | `Admin@123` |
| Mess staff (Counter A) | `ramesh.staff@sqms.edu` | `Staff@123` |
| Mess staff (Counter B) | `sunita.staff@sqms.edu` | `Staff@123` |
| Student (main demo) | `aarav.sharma@sqms.edu` | `Student@123` |

All 20 students use the password `Student@123`. Emails are `firstname.lastname@sqms.edu`:
aarav.sharma, priya.patel, rohan.deshmukh, ananya.iyer, vikram.singh, sneha.kulkarni, arjun.nair, kavya.reddy, aditya.joshi, isha.gupta, karan.mehta, neha.verma, siddharth.rao, pooja.mishra, rahul.chauhan, meera.pillai, yash.agarwal, tanvi.bhosale, omkar.patil, riya.kapoor.

The login page has one-click buttons that fill the student, staff and admin credentials.

### What the seed creates

- 1 admin, 2 staff, 20 students
- 2 counters (A · Main Line, B · Express) and 4 meal sessions (Breakfast, Lunch, Snacks, Dinner)
- Rotating Indian mess menus from 7 days ago to 2 days ahead
- About a week of token history (served, skipped and cancelled), so charts and reports are populated
- A **live queue for the current meal**: Counter A has a token at the counter and 6 waiting; Counter B has 3 waiting and nobody called yet
- Notifications and queue events that match the tokens

`aarav.sharma` is left without an active token so you can demo booking one.

---

## Suggested demo script

1. Sign in as **Aarav (student)** → dashboard → **Generate token** → choose Lunch (or the current meal) and Counter A → confirm.
2. In a **second browser or private window**, sign in as **Ramesh (staff)** → Live queue → **Mark served**, then **Call next** a few times.
3. Watch Aarav's screen update its position and wait time live, show the **turn approaching** toast, and finally the full-screen **"It's your turn"** alert.
4. As staff, try **Recall**, **Skip** (with confirmation) and **Pause queue**. While paused, the student can't book that counter.
5. Sign in as **admin** → Overview charts → Menu (add an item, and the student menu updates immediately) → Reports → **Export report**.

> Sessions use cookies, so use two different browsers (or one normal and one private window) to be signed in as two roles at once.

---

## Testing

An end-to-end API test covers authentication, role permissions, token generation, duplicate prevention, **6 simultaneous bookings**, **5 parallel duplicate requests**, queue ordering, call/recall/serve/skip, invalid transitions, pause/resume, cancellation, notifications (including one-time approach alerts), queue events, admin CRUD, reports and CSV export.

```bash
npm run seed          # fresh data
npm run dev           # in one terminal
npm test              # in another – expects the API on :4000
npm run seed          # reset again before a demo (the test changes data)
```

Type checks and production build:

```bash
npm --prefix server run typecheck
npm run build
```

---

## Project structure

```
SQMS/
├── server/
│   ├── prisma/            schema.prisma, seed.ts
│   ├── scripts/           smoke-test.ts (end-to-end API test)
│   └── src/
│       ├── config/        env, domain constants and state transitions
│       ├── controllers/   HTTP handlers (thin)
│       ├── middleware/    auth (JWT + roles), validation, errors
│       ├── prisma/        Prisma client
│       ├── routes/        /auth /student /staff /admin + shared routes
│       ├── services/      queue engine, analytics, admin, notifications, SSE events
│       ├── utils/         dates, CSV, keyed lock, formatting, HTTP errors
│       └── validators/    Zod schemas
└── client/
    └── src/
        ├── components/    UI kit (Button, Card, Modal, Table…), token card, charts, alerts
        ├── context/       Auth, Toast, Live (SSE), Notifications
        ├── hooks/         useFetch, useLiveEvent, useMeta, useActiveTokens
        ├── layouts/       App shell (collapsible sidebar, top bar), navigation
        ├── pages/         auth, student, staff, admin, shared
        ├── services/      typed API clients (Axios)
        ├── types/         shared TypeScript types
        └── utils/         formatting helpers
```

## Main API endpoints

| Method | Path | Role |
|--------|------|------|
| POST | `/api/auth/login`, `/api/auth/logout` | public |
| GET | `/api/auth/me` · PATCH `/api/auth/profile` · POST `/api/auth/change-password` | any |
| GET | `/api/meta`, `/api/menu?date=`, `/api/queue/status?counterId&mealId`, `/api/notifications`, `/api/events` (SSE) | any |
| POST | `/api/student/tokens` · GET `/api/student/tokens/active` · `/history` · `/:id` · POST `/:id/cancel` | student |
| GET | `/api/staff/queue?counterId&mealId` · POST `/api/staff/queue/call-next` · POST `/api/staff/tokens/:id/{recall,serve,skip}` · POST `/api/staff/counters/:id/{pause,resume}` · GET `/api/staff/activity` | staff |
| GET | `/api/admin/overview` · CRUD `/api/admin/{counters,meals,settings,menu,staff}` · GET `/api/admin/students` · GET `/api/admin/reports` · GET `/api/admin/reports/export?type=summary|tokens` | admin |

## Notes and limitations

- Times use the server's local timezone. Meal timings are enforced only when **Enforce meal timings** is on (Admin → Meal Sessions). It is off in the demo data so booking works at any hour.
- SQLite suits a single-server prototype. For production, switch the Prisma datasource to PostgreSQL and replace the in-process lock and SSE hub with a shared alternative such as Redis when running more than one API instance.
- If the API smoke test runs exactly at a meal changeover (e.g. 09:30), its "current meal" can shift mid-run. Re-run it if that happens.
