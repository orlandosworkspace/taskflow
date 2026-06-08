# Taskflow (demo1)

Taskflow is a full-stack task manager with user accounts, categories, due dates, and installable PWA support. The app was built incrementally as a demo project: a Python standard-library backend serves both a REST API and static frontend assets, with no npm build step or external Python packages.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (vanilla JS ES modules)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ auth-ui  │  │   ui     │  │  tasks   │  │  pwa   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┘ │
│       │             │             │                     │
│       └─────────────┴─────────────┘                     │
│                     │ fetch + Bearer token              │
└─────────────────────┼───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  server.py  (HTTPServer + SimpleHTTPRequestHandler)     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  auth.py │  │  db.py   │  │ static   │             │
│  └──────────┘  └────┬─────┘  │ files    │             │
│                     ▼        └──────────┘             │
│              data/tasks.db (SQLite)                   │
└─────────────────────────────────────────────────────────┘
```

The server is a single process. `TaskHandler` extends Python's `SimpleHTTPRequestHandler` to handle `/api/*` routes and falls through to `super().do_GET()` for static files (`index.html`, `js/`, `style.css`, icons, etc.).

## Tech stack

| Layer      | Choice                                      |
|------------|---------------------------------------------|
| Backend    | Python 3.11, `http.server`, `sqlite3`       |
| Frontend   | Vanilla HTML/CSS/JS (ES modules)            |
| Database   | SQLite (`data/tasks.db`)                    |
| Auth       | PBKDF2 password hashing + bearer tokens     |
| PWA        | Web App Manifest + Service Worker           |
| Deployment | [Render](https://render.com) (free tier)    |

There are zero third-party dependencies. `requirements.txt` is intentionally empty.

## Project structure

```
demo1/
├── server.py          # HTTP server + REST API
├── db.py              # SQLite persistence
├── auth.py            # Password hashing and session tokens
├── index.html         # App shell (auth screen + task UI)
├── style.css          # Design system and layout
├── manifest.json      # PWA manifest
├── sw.js              # Service worker (offline shell caching)
├── render.yaml        # Render deployment blueprint
├── deploy.sh          # Automated GitHub + Render deploy
├── start-online.sh    # Local server + Cloudflare tunnel
├── data/
│   ├── tasks.db       # SQLite database (gitignored)
│   └── tasks.json     # Legacy seed data for one-time migration
├── icons/             # SVG + PNG app icons
└── js/
    ├── app.js         # Entry point and initialization
    ├── auth.js        # Login/register/logout API calls
    ├── auth-ui.js     # Auth screen UI
    ├── api.js         # Authenticated task API client
    ├── state.js       # In-memory app state
    ├── storage.js     # Load tasks from server
    ├── tasks.js       # Task CRUD and filtering logic
    ├── ui.js          # DOM rendering and event wiring
    ├── categories.js  # Category definitions
    ├── dates.js       # Due date formatting and status
    └── pwa.js         # Service worker registration + install prompt
```

## Backend implementation

### HTTP server (`server.py`)

`TaskHandler` routes requests by path and HTTP method:

- **GET** `/api/health` — health check (used by Render)
- **GET/POST** `/api/auth/*` — registration, login, logout, current user
- **GET/POST/PATCH/DELETE** `/api/tasks` — task CRUD
- **POST** `/api/tasks/clear-completed` — bulk delete completed tasks
- **GET** everything else — static files from the project root

Validation is done inline: usernames must match `[a-zA-Z0-9_]{3,20}`, passwords need at least 6 characters, categories must be one of `work`, `personal`, or `shopping`, and due dates must be `YYYY-MM-DD`.

Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) are added on every response.

### Database (`db.py`)

SQLite stores three tables:

- **users** — `id`, `username`, `password_hash`, `created_at`
- **sessions** — `token`, `user_id`, `created_at`
- **tasks** — `id`, `user_id`, `text`, `done`, `category`, `due_date`, `created_at`

On first startup, `init_db()` creates tables and runs a one-time migration from `data/tasks.json` if legacy unassigned tasks exist. Tasks are scoped per user via `user_id` foreign keys.

### Authentication (`auth.py`)

Passwords are hashed with PBKDF2-HMAC-SHA256 (100,000 iterations) and a random salt, stored as `salt$digest`. Session tokens are 32-byte URL-safe secrets. The client sends `Authorization: Bearer <token>` on authenticated requests; the server looks up the token in the `sessions` table.

## Frontend implementation

The frontend uses ES modules with a simple layered structure:

1. **`state.js`** — holds the in-memory task list, active filters, editing state, and current user
2. **`api.js` / `auth.js`** — thin `fetch` wrappers that attach the bearer token
3. **`tasks.js`** — business logic (add, toggle, edit, delete, filter, sort)
4. **`ui.js`** — renders the task list to the DOM, handles inline editing, loading states, and error banners
5. **`auth-ui.js`** — toggles between login/register modes and switches between auth and app screens
6. **`app.js`** — wires everything together on `DOMContentLoaded`

### Rendering model

The UI uses direct DOM manipulation (no framework). `render()` rebuilds the visible task list on every state change. `withLoading()` wraps async operations with a loading class and centralized error handling.

### Filtering and sorting

Tasks can be filtered by:

- **Status** — all, active, or completed
- **Category** — all, work, personal, or shopping

Visible tasks are sorted with incomplete tasks first, then by due date urgency (overdue → today → upcoming → no date).

### Due dates

`dates.js` compares due dates against today's date string to produce `overdue`, `today`, `upcoming`, or `none` status. The UI shows color-coded badges and highlights overdue items.

## API reference

| Method   | Path                        | Auth | Description                |
|----------|-----------------------------|------|----------------------------|
| GET      | `/api/health`               | No   | Health check               |
| POST     | `/api/auth/register`        | No   | Create account             |
| POST     | `/api/auth/login`           | No   | Sign in                    |
| POST     | `/api/auth/logout`          | Yes  | Invalidate session         |
| GET      | `/api/auth/me`              | Yes  | Current user               |
| GET      | `/api/tasks`                | Yes  | List user's tasks          |
| POST     | `/api/tasks`                | Yes  | Create task                |
| PATCH    | `/api/tasks/:id`            | Yes  | Update task fields         |
| DELETE   | `/api/tasks/:id`            | Yes  | Delete task                |
| POST     | `/api/tasks/clear-completed`| Yes  | Remove all completed tasks |

### Task object

```json
{
  "id": "a1b2c3d4e5f6",
  "text": "Buy groceries",
  "done": false,
  "category": "shopping",
  "dueDate": "2026-06-10",
  "createdAt": "2026-06-07T17:22:01.123456+00:00"
}
```

## PWA

The app is installable as a Progressive Web App:

- **`manifest.json`** defines the app name, theme colors, and icon set (SVG + 192px/512px PNG)
- **`sw.js`** caches static assets on install and serves them offline with a network fallback
- API requests (`/api/*`) bypass the cache so data always comes from the server
- **`pwa.js`** registers the service worker and shows an "Install" button when the browser fires `beforeinstallprompt`

## Running locally

```bash
python3 server.py
```

Open [http://localhost:3000](http://localhost:3000). The server reads `PORT` from the environment (defaults to 3000) and creates `data/tasks.db` on first run.

### Public tunnel (optional)

To expose the local server to the internet:

```bash
./start-online.sh
```

This starts the Python server (if not already running) and opens a Cloudflare quick tunnel via `cloudflared`.

## Deployment

### Render (production)

`render.yaml` defines a free-tier Python web service:

- **Build:** `pip install -r requirements.txt` (no-op)
- **Start:** `python3 server.py`
- **Health check:** `/api/health`

### Automated deploy

`deploy.sh` automates the full pipeline:

1. Verifies `git`, `gh`, and `render` CLIs are installed and authenticated
2. Creates or pushes to a GitHub repository
3. Creates or redeploys the Render web service
4. Prints the live URL and verifies the health endpoint

```bash
./deploy.sh
```

Override defaults with environment variables:

```bash
REPO_NAME=my-taskflow SERVICE_NAME=my-taskflow ./deploy.sh
```

## Implementation history

The app was built in phases, each captured as a git commit:

1. **Core task manager** — REST API with JSON file storage, vanilla JS frontend with categories, filters, and inline editing
2. **Online deployment** — `render.yaml`, `runtime.txt`, and static file serving from the same Python process
3. **User accounts + PWA** — SQLite migration, bearer-token auth, due dates, service worker, and web manifest
4. **Taskflow rebrand** — polished UI with Inter font, indigo accent palette, dark gradient background, and refined component styling
5. **Production hardening** — PNG icons for PWA, automated `deploy.sh` with GitHub and Render CLI integration

## Design decisions

- **No build tooling** — ES modules are loaded directly by the browser; Python serves files as-is. This keeps the project easy to read and deploy.
- **Stdlib only** — avoids dependency management and works on Render's free tier without extra configuration.
- **Single server process** — API and static assets share one handler, eliminating CORS complexity in development and production.
- **Optimistic-free updates** — the UI waits for server confirmation before updating state, keeping client and database in sync with simple error handling.
- **Per-user task isolation** — every task query filters by `user_id`, so accounts are fully separated at the database level.