"use client"

import { useState, useEffect, useCallback } from "react"
import { ChartContainer } from "@/components/dashboard/ChartContainer"
import { SignalFeed } from "@/components/dashboard/SignalFeed"
import { IndicatorPanel } from "@/components/dashboard/IndicatorPanel"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"
import { Plus, Trash2, RefreshCw, BarChart2 } from "lucide-react"

interface WatchlistItem {
  symbol: string
  name: string
  price: number | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const PERIODS = ["1D", "1W", "1M"]

export default function DashboardPage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("1D")
  const [loading, setLoading] = useState(true)
  const [newSymbol, setNewSymbol] = useState("")
  const [adding, setAdding] = useState(false)
  const [showAddInput, setShowAddInput] = useState(false)

  const loadWatchlist = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/watchlist`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("watchlist load failed")
      const data = await res.json()
      const items: WatchlistItem[] = data.items || []
      setWatchlist(items)
      // Select first symbol if none selected
      if (items.length > 0 && !selectedSymbol) {
        setSelectedSymbol(items[0].symbol)
      }
    } catch {
      // no-op: show empty state
    } finally {
      setLoading(false)
    }
  }, [token, selectedSymbol])

  useEffect(() => {
    if (token) loadWatchlist()
  }, [token])

  // Auto-refresh prices every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      if (token) loadWatchlist(true)
    }, 30_000)
    return () => clearInterval(timer)
  }, [token, loadWatchlist])

  const handleAdd = async () => {
    const sym = newSymbol.trim().toUpperCase()
    if (!sym) return
    setAdding(true)
    try {
      const res = await fetch(`${API_BASE}/api/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ symbol: sym }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "추가 실패")
      }
      success(`${sym} 추가됨`)
      setNewSymbol("")
      setShowAddInput(false)
      await loadWatchlist(true)
      setSelectedSymbol(sym)
    } catch (e: any) {
      showError(e.message || "추가 실패")
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (symbol: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/watchlist/${symbol}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("삭제 실패")
      success(`${symbol} 제거됨`)
      const remaining = watchlist.filter((i) => i.symbol !== symbol)
      setWatchlist(remaining)
      if (selectedSymbol === symbol) {
        setSelectedSymbol(remaining[0]?.symbol || "")
      }
    } catch {
      showError("제거 실패")
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold leading-tight">Dashboard</h1>
            <p className="text-xs text-muted-foreground">실시간 시그널 · 30초 자동갱신</p>
          </div>
          <div className="flex items-center gap-2">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1 text-xs rounded font-mono transition ${
                  selectedPeriod === p
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-border"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => loadWatchlist(true)}
              className="p-1.5 rounded-lg hover:bg-muted transition"
              title="새로고침"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : "text-muted-foreground"} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] gap-0 h-[calc(100vh-73px)] overflow-hidden">

        {/* Left: Watchlist */}
        <div className="border-r border-border flex flex-col overflow-hidden bg-card/30">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">관심종목</span>
            <button
              onClick={() => setShowAddInput(!showAddInput)}
              className="p-1 rounded hover:bg-muted transition text-blue-600"
              title="종목 추가"
            >
              <Plus size={15} />
            </button>
          </div>

          {showAddInput && (
            <div className="px-3 py-2 border-b border-border bg-muted/30">
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="AAPL"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded font-mono"
                  autoFocus
                />
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded font-bold disabled:opacity-50"
                >
                  {adding ? "..." : "추가"}
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-1">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-xs">로딩 중...</div>
            ) : watchlist.length === 0 ? (
              <div className="text-center py-8 px-4">
                <BarChart2 className="mx-auto mb-2 text-muted-foreground opacity-40" size={24} />
                <p className="text-xs text-muted-foreground">종목을 추가하세요</p>
                <button
                  onClick={() => setShowAddInput(true)}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  + 추가
                </button>
              </div>
            ) : (
              watchlist.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => setSelectedSymbol(item.symbol)}
                  className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/60 ${
                    selectedSymbol === item.symbol ? "bg-blue-600/10 border-l-2 border-blue-600" : "border-l-2 border-transparent"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold font-mono truncate">{item.symbol}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.name || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.price !== null && (
                      <span className="text-xs font-mono font-semibold">${item.price?.toFixed(2)}</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(item.symbol) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-600/10 text-red-600 transition"
                      title="제거"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center: Chart + Indicators */}
        <div className="flex flex-col overflow-hidden">
          {selectedSymbol ? (
            <>
              {/* Chart header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                <span className="text-base font-bold font-mono">{selectedSymbol}</span>
                <span className="text-xs text-muted-foreground">
                  {watchlist.find((i) => i.symbol === selectedSymbol)?.name}
                </span>
              </div>

              {/* Chart */}
              <div className="flex-1 overflow-hidden">
                <ChartContainer symbol={selectedSymbol} period={selectedPeriod} />
              </div>

              {/* Indicators */}
              <div className="border-t border-border px-4 py-3 bg-card/30 max-h-28 overflow-y-auto">
                <IndicatorPanel symbol={selectedSymbol} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart2 className="mx-auto mb-3 opacity-20" size={48} />
                <p className="text-sm">왼쪽에서 종목을 선택하거나 추가하세요</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Signal Feed */}
        <div className="border-l border-border overflow-hidden flex flex-col">
          <SignalFeed />
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
