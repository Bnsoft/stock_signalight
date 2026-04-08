# Signalight — Claude Reference

Stock signal platform: FastAPI backend + Next.js 14 frontend.

## Stack
- **Backend**: Python/FastAPI, SQLite, WebSocket — `signalight-engine/src/`
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS — `signalight-web/signalight-landing/src/`
- **DB**: SQLite via `store.py` (39 tables), file at `signalight-engine/data/`
- **Auth**: Custom JWT (`user_id.timestamp.signature` format)
- **API Base**: `http://localhost:8000` | Frontend: `http://localhost:3000`

## Repo Layout
```
signalight-engine/src/   → 37 Python modules (API + business logic)
signalight-web/signalight-landing/src/app/dashboard/   → 35 page routes
docs/                    → Reference docs (read before working on a feature)
```

## Doc Index — Read Before Working
| Working on...          | Read this first                        |
|------------------------|----------------------------------------|
| API endpoints          | `docs/backend/api-reference.md`        |
| Python modules         | `docs/backend/modules.md`              |
| Database/schema        | `docs/backend/database.md`             |
| Dashboard pages        | `docs/frontend/pages.md`              |
| Components/hooks       | `docs/frontend/components.md`         |
| Signal detection       | `docs/features/signals.md`            |
| Advanced orders        | `docs/features/trading.md`            |
| Crypto/Futures/Forex   | `docs/features/market-data.md`        |
| Portfolio analysis     | `docs/features/portfolio.md`          |
| Alert system           | `docs/features/alerts.md`             |
| CSV/PDF export         | `docs/features/export.md`             |
| WebSocket/streaming    | `docs/features/realtime.md`           |

## Local Dev Start Commands
```bash
# Backend (FastAPI)
cd signalight-engine && uv run uvicorn src.main:app --reload --port 8000

# Frontend (Next.js)
cd signalight-web/signalight-landing && bun dev

# Telegram bot (separate process)
cd signalight-engine && uv run python -m src.app
```

## Deployment
- **Frontend**: Vercel — auto-deploy on push to `main`
- **Backend**: Railway — auto-deploy on push to `main`, root dir = `signalight-engine`
- **DB**: Supabase PostgreSQL (primary) + SQLite local backup

## Rules
- All code comments and docstrings in **English**
- User-facing strings (UI labels, API response values) may remain in Korean
- Frontend follows Next.js 14 App Router conventions — see `signalight-web/signalight-landing/AGENTS.md`
- Always update relevant `docs/` file after adding/changing features
- DB changes go in `store.py` `_init_db()` → update `docs/backend/database.md`
- New API endpoints → update `docs/backend/api-reference.md`
