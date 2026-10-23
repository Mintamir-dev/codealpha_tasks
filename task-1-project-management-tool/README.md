# PM Tool

A project management tool: projects, Kanban boards (To Do, In Progress, Done, Blocked), tasks, comments,
notifications and live updates. Built from SRS v1.1 and the front-end design.

```
backend/    Node.js, Express, PostgreSQL, Socket.IO   (design in backend/docs/BACKEND_DESIGN.md)
frontend/   React, Vite, Tailwind CSS
```

## Quick start (two terminals)

Requirements: Node.js 18+ and PostgreSQL 13+.

```bash
# Terminal 1: backend
cd backend
npm install
cp .env.example .env            # set DATABASE_URL and JWT_SECRET
createdb pm_tool
npm run db:migrate
npm run db:seed:demo            # administrator + demo data (password123)
npm run dev                     # http://localhost:4000

# Terminal 2: frontend
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Open http://localhost:5173 and log in as `hana@example.com` / `password123`.

## Status

| Part | State |
| --- | --- |
| Backend API, database, real-time, unit tests | Done. Not yet run against a real database in the environment where it was written. |
| Frontend screens from the design | Done. Not yet run in a browser in the environment where it was written. |
| Project dashboard screen (counts, weekly chart, member stats) | The API exists (`GET /projects/:id/dashboard`); the design has no screen for it, so the page is not built. |
| Activity log screen | The API exists (`GET /projects/:id/activity`); no screen yet. |
| End-to-end tests | Not written. |
