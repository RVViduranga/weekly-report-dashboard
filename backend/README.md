---
title: Weekly Reports API
emoji: 📋
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Weekly Reports API

Express 5 + TypeScript + Prisma 6 API behind the Weekly Report Generator &
Team Dashboard. PostgreSQL is hosted on Neon; this service holds no data of
its own.

The YAML block above is Hugging Face Space configuration - it tells Spaces to
build the `Dockerfile` in this directory and route public traffic to port 7860.
It is ignored everywhere else.

## Running locally

```bash
npm install
npx prisma migrate deploy
npm run seed      # optional demo data
npm run dev       # http://localhost:4000
```

## Environment

| Variable       | Purpose                                                        |
| -------------- | -------------------------------------------------------------- |
| `DATABASE_URL` | Pooled Neon connection. The running app uses this one.          |
| `DIRECT_URL`   | Direct Neon connection, no `-pooler` in the host. Migrations.   |
| `JWT_SECRET`   | Signs the session cookie. Rotating it signs everyone out.       |
| `FRONTEND_URL` | Comma-separated origins allowed through CORS.                   |
| `PORT`         | Defaults to 4000; the container sets 7860.                      |

None of these are committed. Locally they live in `.env`; on a Space they are
entered as Secrets.

## Health check

`GET /api/health` returns `{ "status": "ok" }` and touches nothing else, so it
is safe to poll.
