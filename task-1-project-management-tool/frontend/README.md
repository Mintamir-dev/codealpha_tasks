# PM Tool: Frontend

React 18 + Vite + Tailwind CSS. It follows the front-end design (PDF) and talks to the backend in `../backend`.

## Run it

Start the backend first (see `../backend/README.md`), then:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

In development Vite forwards `/api` and `/socket.io` to `http://localhost:4000`, so no CORS setup is needed.
Log in with a demo account after `npm run db:seed:demo` in the backend:
`hana@example.com` / `password123` (Manager of "Final-year thesis"), or `dawit@example.com` / `selam@example.com`
(Members). The administrator is the account set in the backend `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).

## Build for production

```bash
npm run build        # output in dist/
```

Serve `dist/` from any static host. Set `VITE_API_URL` (see `.env.example`) to the public API address before building,
and add the site address to `CORS_ORIGIN` in the backend `.env`. Single-page routing needs the host to return
`index.html` for unknown paths.

## Screens (from the design)

| Screen | Route | File |
| --- | --- | --- |
| Log in / Create account / Forgot password | `/login` | `pages/AuthPage.jsx` |
| Choose a new password | `/reset-password?token=...` | `pages/ResetPasswordPage.jsx` |
| Your projects (cards, filters, search, empty state) | `/projects` | `pages/ProjectsPage.jsx` |
| Board (4 columns, drag and drop, filters, members panel, empty state, Member view, mobile tabs) | `/projects/:id` | `pages/BoardPage.jsx` |
| Task detail with comments and @mentions | `/projects/:id/tasks/:taskId` | `pages/TaskPage.jsx` |
| Project settings (details, members, task permissions, delete) | `/projects/:id/settings` | `pages/SettingsPage.jsx` |
| Notifications | `/notifications` | `pages/NotificationsPage.jsx` |
| Profile (details, password, delete account) | `/profile` | `pages/ProfilePage.jsx` |
| Administration (users, projects) | `/admin` | `pages/AdminPage.jsx` |

## How it is organised

```
src/
  api/          fetch wrapper (adds the token, turns errors into ApiError) and one function per endpoint
  context/      Auth (token in localStorage), Socket (live updates), Notifications (bell count), Toast
  components/   Layout, Task card, forms and modals, avatars, rich text (links and @mentions), mention textarea
  pages/        one file per screen
  utils/        date and name formatting
  constants.js  statuses, priorities and their colors
```

Design colors and sizes are defined once in `tailwind.config.js`.

## Behaviour worth knowing

- **Permissions in the UI** mirror the server: Members only see "New task" if the Manager allowed it, can drag only
  cards assigned to them, and never see Edit/Delete task or Project settings. The server enforces every rule anyway.
- **Live updates:** when someone else changes a task, member or project, the board and task page refresh. Your own
  changes are applied immediately. If the socket connection fails, everything still works; you just need to reload to
  see other people's changes.
- **Moving a card to Blocked** asks for an optional reason, which appears on the card.
- **Small screens (under 768 px):** the board becomes status tabs, and each card has a Status dropdown instead of
  drag and drop.
- **Comments and descriptions:** web links are clickable; `@Full Name` is highlighted and notifies that member.
  Text is always shown as text, never as HTML.
