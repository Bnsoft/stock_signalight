"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Plus, Trash2, Star, TrendingUp, TrendingDown, RefreshCw, BarChart2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"
import Link from "next/link"

interface WatchlistItem {
  symbol: string
  name: string
  price: number | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function WatchlistPage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSymbol, setNewSymbol] = useState("")
  const [adding, setAdding] = useState(false)

  const loadWatchlist = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`${API_BASE}/api/watchlist`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to load watchlist")
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      showError("관심종목을 불러오지 못했습니다")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    loadWatchlist()
    // Auto-refresh every 30s
    const timer = setInterval(() => loadWatchlist(true), 30_000)
    return () => clearInterval(timer)
  }, [loadWatchlist])

  const handleAdd = async () => {
    const sym = newSymbol.trim().toUpperCase()
    if (!sym) { showError("종목 심볼을 입력하세요"); return }
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
      success(`${sym} 추가되었습니다`)
      setNewSymbol("")
      setShowAddForm(false)
      await loadWatchlist()
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
      success(`${symbol} 제거되었습니다`)
      setItems((prev) => prev.filter((i) => i.symbol !== symbol))
    } catch {
      showError("제거에 실패했습니다")
    }
  }

  const validPrices = items.filter((i) => i.price !== null).map((i) => i.price as number)
  const avgPrice = validPrices.length ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">관심종목</h1>
              <p className="text-muted-foreground">실시간 시세 (yfinance · 15분 지연)</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadWatchlist(true)}
                disabled={refreshing}
                className="p-2 hover:bg-muted rounded-lg transition-all"
                title="새로고침"
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin text-blue-600" : ""} />
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all"
              >
                <Plus size={18} />
                추가
              </button>
            </div>
          </div>
        </AnimateIn>

        {showAddForm && (
          <AnimateIn from="bottom" delay={80}>
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">관심종목 추가</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="종목 심볼 (예: AAPL, SPY, QQQ)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                  autoFocus
                />
                <button
                  onClick={handleAdd}
                  disabled={adding}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {adding ? "확인 중..." : "추가"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg transition-all"
                >
                  취소
                </button>
              </div>
            </div>
          </AnimateIn>
        )}

        <AnimateIn from="bottom" delay={120}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-1">관심종목 수</p>
              <p className="text-3xl font-bold">{items.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-1">평균 주가</p>
              <p className="text-3xl font-bold">${avgPrice.toFixed(2)}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-1">데이터 소스</p>
              <p className="text-lg font-bold text-blue-600">yfinance</p>
              <p className="text-xs text-muted-foreground">15분 지연 · 30초 자동갱신</p>
            </div>
          </div>
        </AnimateIn>

        <AnimateIn from="bottom" delay={200}>
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">로딩 중...</div>
          ) : items.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <Star className="mx-auto mb-4 text-muted-foreground" size={32} />
              <p className="text-muted-foreground mb-4">관심종목이 없습니다</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                첫 번째 종목 추가
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.symbol}
                  className="bg-card border border-border rounded-lg p-5 hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-xl font-bold">{item.symbol}</h3>
                        <p className="text-sm text-muted-foreground">{item.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {item.price !== null ? (
                          <p className="text-2xl font-bold">${item.price.toFixed(2)}</p>
                        ) : (
                          <p className="text-lg text-muted-foreground">시세 없음</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/charts?symbol=${item.symbol}`}
                          className="p-2 hover:bg-muted rounded-lg transition-all text-blue-600"
                          title="차트 보기"
                        >
                          <BarChart2 size={18} />
                        </Link>
                        <button
                          onClick={() => handleRemove(item.symbol)}
                          className="p-2 hover:bg-red-600/10 rounded-lg transition-all text-red-600"
                          title="제거"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimateIn>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
