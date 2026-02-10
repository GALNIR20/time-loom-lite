# Predictor — Developer Setup Guide

> One-pager to get the full stack (frontend + PocketBase backend) running on a fresh machine.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 18+ | https://nodejs.org |
| **npm** | 9+ | comes with Node |
| **PocketBase** | 0.26+ | https://pocketbase.io/docs |
| **Git** | any | https://git-scm.com |

---

## 1. Clone the repo

```bash
git clone <REPO_URL>
cd time-loom-lite/fms
```

---

## 2. Install frontend dependencies

```bash
npm install
```

---

## 3. Set up PocketBase (backend + database)

### 3a. Download PocketBase

Go to https://pocketbase.io/docs and download the binary for your OS:

| OS | File |
|----|------|
| macOS (Apple Silicon) | `pocketbase_*_darwin_arm64.zip` |
| macOS (Intel) | `pocketbase_*_darwin_amd64.zip` |
| Windows | `pocketbase_*_windows_amd64.zip` |
| Linux | `pocketbase_*_linux_amd64.zip` |

Extract the `pocketbase` binary and place it in the **project root** (same folder as `package.json`). Rename it to `pocketbase_run` (or leave as `pocketbase` — just note the name you use).

```bash
# Example on macOS / Linux:
cp ~/Downloads/pocketbase_0.26.8_darwin_arm64/pocketbase ./pocketbase_run
chmod +x ./pocketbase_run
```

### 3b. Run PocketBase with migrations

The repo includes a `pb_migrations/` folder with all the database schema. PocketBase auto-applies these on first start.

```bash
./pocketbase_run serve
```

You should see:

```
Server started at http://127.0.0.1:8090
├─ REST API:  http://127.0.0.1:8090/api/
└─ Dashboard: http://127.0.0.1:8090/_/
```

### 3c. Create your first superuser

On first launch, PocketBase prints a one-time setup URL in the terminal. Open it in your browser to create the **superuser** (admin) account.

Alternatively, run:

```bash
./pocketbase_run superuser upsert your-email@example.com your-password
```

### 3d. Verify the collections

Open the PocketBase dashboard at **http://127.0.0.1:8090/_/** and log in with the superuser credentials. You should see these collections (auto-created by migrations):

| Collection | Type | Purpose |
|------------|------|---------|
| `users` | Auth | User accounts (email/password) with `role`, `is_approved`, `allowed_games` fields |
| `projects` | Base | PLC timeline projects with `feature_name`, `preset`, `overrides`, `game`, etc. |
| `project_activity` | Base | Activity log entries linked to projects |

### 3e. Create the first app user

The PocketBase superuser is separate from app users. To log into the frontend:

1. Open `http://localhost:8080/auth` and **Sign Up** with an email & password.
2. Go to the PocketBase dashboard → `users` collection → find the new user.
3. Set `is_approved` to `true` and `role` to `admin`.
4. Optionally set `allowed_games` to `["SGH","HOF"]`.

Now you can log into the app as an admin.

---

## 4. Start the frontend

In a **separate terminal** (keep PocketBase running):

```bash
npm run dev
```

The app starts at **http://localhost:8080/**.

### Environment variable (optional)

By default the frontend connects to PocketBase at `http://127.0.0.1:8090`. To override, create a `.env` file:

```
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

---

## 5. Quick architecture overview

```
┌─────────────────────────────────────────────┐
│  Browser — React + Vite (port 8080)         │
│  ├─ src/lib/pocketbase.ts  → PB SDK client  │
│  ├─ src/hooks/             → data hooks      │
│  └─ src/pages/             → routes          │
└──────────────┬──────────────────────────────┘
               │  REST + Realtime (WebSocket)
┌──────────────▼──────────────────────────────┐
│  PocketBase server (port 8090)              │
│  ├─ pb_migrations/  → schema auto-applied   │
│  └─ pb_data/        → SQLite database files │
└─────────────────────────────────────────────┘
```

### Key files

| Path | What it does |
|------|--------------|
| `src/lib/pocketbase.ts` | PocketBase client instance |
| `src/hooks/useAuth.tsx` | Auth context (sign up / in / out) |
| `src/hooks/useProjects.tsx` | CRUD + realtime sync for projects |
| `src/hooks/useAdmin.ts` | Admin user/project management |
| `src/hooks/useGame.tsx` | Game board selection context |
| `src/hooks/useMilestoneSettings.ts` | Per-game PLC milestone config (localStorage) |
| `src/hooks/useChecklistSettings.ts` | Per-game deliverable checklists (localStorage) |
| `pb_migrations/` | Database schema migrations (auto-run by PocketBase) |
| `vite.config.ts` | Vite config — dev server on port 8080 |

### Data flow

- **Database (PocketBase):** users, projects, activity logs.
- **localStorage:** milestone settings, checklist settings, selected game — all per-game-scoped.
- **Realtime:** projects collection uses PocketBase's SSE subscription for live updates across tabs/users.

---

## 6. Common tasks

| Task | Command |
|------|---------|
| Start PocketBase | `./pocketbase_run serve` |
| Start frontend dev server | `npm run dev` |
| Build for production | `npm run build` (outputs to `dist/`) |
| Preview production build | `npm run preview` |
| Open PocketBase admin | http://127.0.0.1:8090/_/ |

---

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| `address already in use` on 8090 | Kill the old process: `pkill pocketbase_run` |
| `address already in use` on 8080 | Another Vite instance is running — kill it or use `--port 8081` |
| Frontend shows "connection error" | Make sure PocketBase is running on port 8090 |
| "Account Pending Approval" screen | Set `is_approved = true` in PocketBase dashboard → `users` |
| Can't see any games on select screen | Set `allowed_games` to `["SGH","HOF"]` for the user in PocketBase |
| Migrations not applied | Ensure `pb_migrations/` is in the same directory where you run PocketBase |

---

**That's it!** Two terminals — PocketBase + Vite — and you're ready to develop.
