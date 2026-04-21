# Dashboard Pages

Base path: `signalight-web/signalight-landing/src/app/dashboard/`
All pages: `"use client"`, use `useAuth()` for `token` + `user?.user_id`.

## Active Pages

| Route | File | Description |
|-------|------|-------------|
| `/dashboard` | `page.tsx` | Home — links to all tools |
| `/dashboard/alerts` | `alerts/page.tsx` | Alarm management (price / MA / volume) |
| `/dashboard/calculator` | `calculator/page.tsx` | ROI / profit calculator |
| `/dashboard/backtest-calculator` | `backtest-calculator/page.tsx` | Backtest strategy calculator |
| `/dashboard/data-export` | `data-export/page.tsx` | Export signals / alerts as CSV |
| `/dashboard/profile` | `profile/page.tsx` | User profile + Telegram settings |

## Navigation

Sidebar: `src/components/dashboard/DashboardNav.tsx`
- Two groups: **도구** (4 items) and **계정** (1 item)
- Collapsible on desktop, drawer on mobile

## Auth Pages

| Route | Description |
|-------|-------------|
| `/auth/login` | Email login + Guest mode |
| `/auth/signup` | Register |
