# PM Tool: Backend

REST API and WebSocket server for the Project Management Tool (SRS v1.1).
Design details: [docs/BACKEND_DESIGN.md](docs/BACKEND_DESIGN.md).

## Requirements

- Node.js 18 or newer
- PostgreSQL 13 or newer

## Setup

```bash
cd backend
npm install
cp .env.example .env          # then edit DATABASE_URL and JWT_SECRET
createdb pm_tool              # or create the database any other way
npm run db:migrate            # creates the tables
npm run db:seed               # creates the first administrator from the ADMIN_* variables
npm run db:seed:demo          # optional: demo users and the "Final-year thesis" project from the design
npm run dev                   # http://localhost:4000
```

Demo accounts (password `password123`): hana@example.com (Manager of the thesis project),
dawit@example.com, selam@example.com, abel@example.com, betty@example.com.
The administrator uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

## Environment variables

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (`DATABASE_SSL=true` for most hosted databases) |
| `JWT_SECRET` | Secret for signing tokens. Use 32+ random characters in production |
| `JWT_EXPIRES_IN` | Token lifetime, default `8h` |
| `BCRYPT_COST` | Password hashing cost, minimum 10 |
| `CORS_ORIGIN` | Front-end origin(s), comma separated |
| `FRONTEND_URL` | Used in password-reset links |
| `APP_TIMEZONE` | Time zone for "overdue", "due this week" and weekly reports (default `Africa/Addis_Ababa`) |
| `LOGIN_MAX_FAILURES`, `LOGIN_WINDOW_MINUTES` | Log-in rate limit (default 5 failures in 10 minutes) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used only by `npm run db:seed` |

Secrets live in `.env` only (NFR-SEC-06); `.env` is in `.gitignore`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with automatic restart |
| `npm start` | Start for production |
| `npm run db:migrate` | Apply `db/schema.sql` (safe to repeat) |
| `npm run db:seed` / `db:seed:demo` | Administrator / demo data |
| `npm test` | Run the unit tests (no database needed) |

## Try it

```bash
# log in
curl -s -X POST localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"hana@example.com","password":"password123"}'

# use the token
TOKEN=...   # the "token" value from the answer above
curl -s localhost:4000/api/projects -H "Authorization: Bearer $TOKEN"
curl -s localhost:4000/api/projects/1/tasks?sort=priority -H "Authorization: Bearer $TOKEN"
```

Real-time client example:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:4000', { auth: { token } });
socket.on('task:moved', ({ task, from, to }) => { /* update the board */ });
socket.on('notification:new', ({ notification }) => { /* bump the bell */ });
```

## Notes

- Behind a reverse proxy, keep `trust proxy` as set in `src/app.js` so the log-in limiter sees real client IPs.
- Use HTTPS in production (NFR-SEC-02), terminated at the proxy or hosting platform.
- The password-reset link is printed to the server log until an email service is added (`src/utils/mailer.js`).
