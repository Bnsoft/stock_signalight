# Frontend Components & Conventions

Base: `signalight-web/signalight-landing/src/`

## Project Conventions
- Framework: Next.js 14 App Router — read `AGENTS.md` before any Next.js work
- All dashboard pages: `"use client"` directive
- Styling: Tailwind CSS + CSS variables (`bg-background`, `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`)
- Icons: `lucide-react`
- Auth: `useAuth()` from `@/context/AuthContext` → `{ user, token }`
- API base: `const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"`

## Auth Pattern
```tsx
const { user, token } = useAuth()
// Fetch with auth:
fetch(`${API_BASE}/api/endpoint`, { headers: { Authorization: `Bearer ${token}` } })
```

## Shared Components (`src/components/`)

| Component | Path | Usage |
|-----------|------|-------|
| `AnimateIn` | `layout/AnimateIn` | Entrance animations `<AnimateIn from="bottom" delay={80}>` |
| `ToastContainer` | `ToastContainer` | Toast notification display |
| `Pagination` | `Pagination` | Table pagination |

## Custom Hooks (`src/hooks/`)

| Hook | Returns | Usage |
|------|---------|-------|
| `useAuth()` | `{ user, token, logout }` | Auth state + token |
| `useToast()` | `{ toasts, removeToast, success, error }` | Toast notifications |
| `usePagination(pageSize)` | `{ startIndex, endIndex, pageRange, hasNextPage, hasPrevPage, prevPage, nextPage, goToPage, setTotal, changePageSize }` | Table pagination |
| `useRealtimeData` | `{ usePriceUpdate, useChartData, useIndicators }` | WebSocket data (`src/hooks/useRealtimeData.ts`) |

## Real-time Hook Pattern
```tsx
import { usePriceUpdate } from "@/hooks/useRealtimeData"
const price = usePriceUpdate("SPY")  // auto-reconnects WebSocket
```

## Pagination Pattern
```tsx
const pagination = usePagination(15)
// After data loads:
pagination.setTotal(data.length)
const displayData = data.slice(pagination.startIndex, pagination.endIndex)
// Render:
<Pagination state={pagination} pageRange={pagination.pageRange}
  hasNextPage={pagination.hasNextPage} hasPrevPage={pagination.hasPrevPage}
  onPreviousPage={pagination.prevPage} onNextPage={pagination.nextPage}
  onGoToPage={pagination.goToPage} onChangePageSize={pagination.changePageSize} />
```

## Standard Page Layout
```tsx
"use client"
export default function SomePage() {
  const { user, token } = useAuth()
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <h1 className="text-3xl font-bold mb-2">Title</h1>
        </AnimateIn>
        <AnimateIn from="bottom" delay={80}>
          {/* content */}
        </AnimateIn>
      </div>
    </div>
  )
}
```

## Tab Pattern
```tsx
type Tab = "tab1" | "tab2"
const [activeTab, setActiveTab] = useState<Tab>("tab1")

const TabButton = ({ tab, label }: { tab: Tab; label: string }) => (
  <button
    onClick={() => setActiveTab(tab)}
    className={`px-4 py-2 rounded-lg transition-all text-sm ${
      activeTab === tab ? "bg-blue-600 text-white" : "bg-muted text-foreground hover:bg-muted/80"
    }`}
  >
    {label}
  </button>
)
```

## Card Pattern
```tsx
<div className="bg-card border border-border rounded-lg p-6">
  <p className="text-xs text-muted-foreground mb-2">Label</p>
  <p className="text-2xl font-bold">Value</p>
</div>
```

## Table Pattern
```tsx
<div className="bg-card border border-border rounded-lg overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead><tr className="border-b border-border bg-muted/50">
        <th className="px-6 py-3 text-left">Column</th>
      </tr></thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx} className="border-b border-border hover:bg-muted/50">
            <td className="px-6 py-3">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

## Color Conventions
- Positive/Gain: `text-green-600`
- Negative/Loss: `text-red-600`
- Info/Primary: `text-blue-600`
- Warning: `text-yellow-600`
- Status badges: `bg-green-600/20 text-green-600` / `bg-red-600/20 text-red-600` / `bg-yellow-600/20 text-yellow-600`
