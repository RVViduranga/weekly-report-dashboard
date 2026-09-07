# Weekly Report Generator & Team Dashboard

A small internal tool where team members file structured weekly reports, managers
review them and send them back for correction when needed, and the whole team's
work rolls up into a dashboard.

## What it does

- **Team members** create a weekly report from a fixed template — tasks completed
  (with planned vs actual %, time planned vs spent, and the deliverable produced),
  what they plan to do next week, blockers, achievements, and hours by task type.
  They save it as a draft, then submit it for review.
- **Managers** see every report on one dashboard, filter it by person, project,
  status or date range, then approve a report or send it back with a comment.
- Every submission is snapshotted, so a manager can see **each past version of a
  week's report** and which version a given comment was written against.

### The review cycle

```
DRAFT ──submit──> SUBMITTED ──approve──> APPROVED
                      │
                      └──request changes──> NEEDS_CORRECTION
                                                  │
                                            (member edits)
                                                  │
                                                  └──resubmit──> SUBMITTED
```

A report is only editable while it is `DRAFT` or `NEEDS_CORRECTION`, and only by
the person who owns it. Managers can change a report's status and leave a comment,
but never its content.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL (hosted on Neon), Prisma ORM |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing |
| Validation | Zod |
| Tests | Vitest + Supertest |

## Project structure

```
weekly-report-dashboard/
├─ backend/
│  ├─ prisma/
│  │  ├─ schema.prisma        # database schema
│  │  ├─ migrations/          # generated SQL migrations
│  │  └─ seed.ts              # demo data
│  └─ src/
│     ├─ routes/              # URL -> controller, and the access rules
│     ├─ controllers/         # HTTP in, HTTP out
│     ├─ services/            # business logic + database access
│     ├─ middleware/          # authenticate, requireRole
│     ├─ validators/          # Zod request schemas
│     ├─ lib/                 # prisma client, jwt, password, errors
│     ├─ __tests__/           # role-based access control tests
│     ├─ app.ts               # builds the Express app
│     └─ index.ts             # starts the server
├─ frontend/
│  └─ src/
│     ├─ app/
│     │  ├─ globals.css       # the design tokens both themes read from
│     │  └─ ...               # pages (Next.js App Router)
│     ├─ components/
│     │  ├─ ui/               # button, card, table, field, skeleton, empty state
│     │  └─ ...               # report detail, report form, version history
│     ├─ context/             # auth context
│     ├─ lib/                 # api client, formatting, form helpers, chart palette
│     └─ types/               # shared API types
└─ docs/
   └─ er-diagram.png          # database diagram
```

## Getting started

### Prerequisites

- Node.js 20 or newer
- A PostgreSQL database. The quickest option is a free project on
  [neon.tech](https://neon.tech) — no local install needed.

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd weekly-report-dashboard

cd backend
npm install

cd ../frontend
npm install
```

### 2. Set up the database

Create a PostgreSQL database (on Neon, create a project and copy its connection
string). Then create `backend/.env`:

```
PORT=4000
FRONTEND_URL=http://localhost:3200
DATABASE_URL="postgresql://user:password@host-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@host.region.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET=a-long-random-string
```

- `DATABASE_URL` is the **pooled** connection, used by the running app.
- `DIRECT_URL` is the same connection **without** `-pooler` in the hostname. Prisma
  uses it for migrations, which need a direct connection.
- Generate a `JWT_SECRET` with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

Create the tables and load demo data:

```bash
cd backend
npx prisma migrate deploy
npm run seed
```

### 3. Configure the frontend

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 4. Run both servers

In one terminal:

```bash
cd backend
npm run dev          # http://localhost:4000
```

In another:

```bash
cd frontend
npm run dev          # http://localhost:3200
```

Open **http://localhost:3200**.

> The frontend runs on port 3200 rather than 3000 because some Windows machines
> reserve the 3000 range. If you change it, update `FRONTEND_URL` in
> `backend/.env` to match, or the browser will block the requests as cross-origin.

## Deploying

`render.yaml` at the repository root defines both services as a Render
Blueprint. The database stays on Neon - only its connection strings are pasted
into Render, never committed.

**New Blueprint** on Render, point it at this repository, and it picks the file
up. Render will ask for the four values marked `sync: false`. Two of them are
the Neon strings from `backend/.env`. The other two are circular - each service
needs the other's URL - so leave them blank on the first deploy and fill them in
once both services have one:

| Service | Variable | Value |
|---|---|---|
| `weekly-reports-api` | `FRONTEND_URL` | `https://weekly-reports-web.onrender.com` |
| `weekly-reports-web` | `NEXT_PUBLIC_API_URL` | `https://weekly-reports-api.onrender.com/api` |

Use the URLs Render actually assigned - it appends a suffix when a name is
already taken.

Then **redeploy the web service**, not just restart it. Next.js bakes
`NEXT_PUBLIC_*` into the bundle at build time, so a restart keeps the old value
and every request still goes to `localhost:4000`.

A few things worth knowing before you rely on it:

- **Render asks to verify a payment card before it will run anything, including
  on the free plan.** No card, no deploy - that is an account gate, not
  something configuration can work around.
- **Free services sleep after 15 minutes idle** and take the better part of a
  minute to wake. The first page load after a quiet spell is slow. Open the app
  and let it wake before demonstrating it to anyone.
- `FRONTEND_URL` accepts a comma-separated list, so the deployed origin and
  `http://localhost:3200` can both be allowed while you are still working
  locally.

## Demo accounts

The seed script creates 2 managers and 5 team members. **Password for all of them
is `password123`.**

| Role | Email | What their data shows |
|---|---|---|
| Manager | `manager@example.com` | Sarah Fernando |
| Manager | `nimali@example.com` | Nimali Perera |
| Team member | `alex@example.com` | A report awaiting review |
| Team member | `dinusha@example.com` | A report sent back for correction |
| Team member | `kavindu@example.com` | An unsubmitted draft |
| Team member | `priya@example.com` | A week with no report yet |
| Team member | `tharindu@example.com` | A report awaiting review |

The seed covers 6 weeks, 4 active projects (plus 1 archived), and 28 reports across
every status, so the dashboard has something real to show. Several approved reports
carry two versions, with the manager's comment on the first — that is the version
history in action.

## Scripts

### Backend

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with auto-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run seed` | Wipe and reload the demo data |
| `npm test` | Run the access-control test suite |
| `npx prisma studio` | Browse the database in a GUI |

### Frontend

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js on port 3200 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |

## API

All routes are under `/api`. Authentication is a JWT in an httpOnly cookie, so
requests from the browser must be sent with `credentials: "include"`.

| Method | Route | Who can call it |
|---|---|---|
| `POST` | `/auth/register` | anyone |
| `POST` | `/auth/login` | anyone |
| `POST` | `/auth/logout` | anyone |
| `GET` | `/auth/me` | signed in |
| `GET` | `/projects` | signed in |
| `POST` `PATCH` `DELETE` | `/projects`, `/projects/:id` | manager |
| `POST` | `/reports` | signed in (creates their own) |
| `GET` | `/reports/mine` | signed in (their own only) |
| `GET` | `/reports` | **manager** (whole team, filtered + paginated) |
| `GET` | `/reports/:id` | owner or manager |
| `PATCH` | `/reports/:id` | owner, and only while editable |
| `POST` | `/reports/:id/submit` | owner |
| `POST` | `/reports/:id/review` | **manager** |
| `GET` | `/reports/:id/versions` | owner or manager |
| `GET` `POST` `PATCH` `DELETE` | `/users`, `/users/:id` | **manager** |
| `GET` | `/dashboard` | **manager** |

`GET /reports` and `GET /reports/mine` accept `page`, `pageSize`, `userId`,
`projectId`, `status`, `weekStart`, `from` and `to`.

### Access control

Two layers, because they answer different questions:

- **Route level** — `requireRole("MANAGER")` on routes that are manager-only. This
  is a fixed rule and does not need to look at the data.
- **Service level** — ownership checks inside the service, because "is this your
  report?" can only be answered by reading the row.

Asking for someone else's report returns **404, not 403**, so the API never
confirms that a report you are not allowed to see exists.

## Tests

```bash
cd backend
npm test
```

15 tests covering the access rules: unauthenticated requests, team members hitting
manager-only endpoints, ownership isolation between team members, and the rule that
a manager can change a report's status but not rewrite its content. The suite runs
against the seeded database and only performs reads and rejected writes, so it does
not disturb the demo data.

## Interface

A left sidebar, a context header, and one content column. `AppShell` holds the
two together: the sidebar is the same component on a laptop and inside the mobile
drawer, and the navigation it renders is role-based - the Manage group only
exists for a manager. Nothing in it points at a page that was not built.

One token layer, two themes. `src/app/globals.css` defines a semantic palette -
surfaces, lines, ink, one accent, four status colours - once for light and once
for dark. Components name the token, never the colour, so there is no `dark:`
variant anywhere in the markup and the two themes cannot drift apart.
`src/components/ui/` holds the primitives the rest is built from: button, card,
table, form field, dropdown menu, dialog, toast, avatar, badge, skeleton and
empty state.

The theme follows the system by default, and the toggle in the header overrides
it. The choice is stored in `localStorage` and re-applied by a small inline
script in the document head, which runs while the HTML is still parsing - so a
saved theme is already in place at the first paint instead of flashing in after
hydration.

Four things that are easy to skip, and were not:

- **The chart palette is checked, not picked by eye.** The four status hues are
  validated as a set for colour-vision deficiency and for 3:1 contrast against
  their own surface, in the order they are stacked. Charts with a single series
  use the interface accent instead, so they read as part of the page rather than
  a guest on it.
- **Loading states are shaped like the content they replace**, so the page does
  not jump when the data lands.
- **One focus treatment**, defined once, for everything the keyboard can reach.
- **Wide tables scroll inside their own card**, so no page scrolls sideways on a
  phone.
- **Reviewing is deliberate.** Approving and sending back both go through a
  confirmation that names the consequence, because a stray click on a review
  page changes someone else's record.
- **The bell is real.** It counts what is actually waiting - reports to review
  for a manager, reports sent back for a team member - from the reports
  themselves rather than a notifications table nobody wrote.

## Database

See `docs/er-diagram.png` for the full schema.

Two design decisions worth calling out:

- **`ReportVersion` holds the history.** The live `Report` row is edited in place,
  but every submission also writes a `ReportVersion` with a JSON snapshot of the
  content. The manager's decision and comment are stored on that version row, which
  is what makes "which version was this comment about?" answerable.
- **Projects are archived, not deleted.** `Project.isActive` is set to `false`
  instead of removing the row, so months of reports that reference it stay intact.
