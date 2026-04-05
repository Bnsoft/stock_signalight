"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Plus, Trash2, Star, Bell, TrendingUp, TrendingDown } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"

interface WatchlistItem {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  dayHigh: number
  dayLow: number
  52WeekHigh: number
  52WeekLow: number
  addedDate: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function WatchlistPage() {
  const { user, token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 175.45,
      change: 2.35,
      changePercent: 1.36,
      dayHigh: 176.50,
      dayLow: 173.20,
      52WeekHigh: 199.62,
      52WeekLow: 164.08,
      addedDate: "2026-03-15",
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corporation",
      price: 380.25,
      change: -1.25,
      changePercent: -0.33,
      dayHigh: 383.50,
      dayLow: 377.40,
      52WeekHigh: 416.00,
      52WeekLow: 323.25,
      addedDate: "2026-02-20",
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      price: 140.50,
      change: 3.15,
      changePercent: 2.29,
      dayHigh: 141.80,
      dayLow: 138.90,
      52WeekHigh: 176.08,
      52WeekLow: 102.21,
      addedDate: "2026-04-01",
    },
  ])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSymbol, setNewSymbol] = useState("")

  const handleAddToWatchlist = async () => {
    if (!newSymbol.trim()) {
      showError("종목 심볼을 입력하세요")
      return
    }

    const symbol = newSymbol.toUpperCase()

    // Check if already exists
    if (watchlist.some((w) => w.symbol === symbol)) {
      showError("이미 관심종목에 추가되었습니다")
      return
    }

    // Mock add
    const newItem: WatchlistItem = {
      symbol,
      name: `${symbol} Inc.`,
      price: 150.0,
      change: 1.5,
      changePercent: 1.01,
      dayHigh: 152.5,
      dayLow: 148.5,
      52WeekHigh: 160.0,
      52WeekLow: 120.0,
      addedDate: new Date().toISOString().split("T")[0],
    }

    setWatchlist([...watchlist, newItem])
    setNewSymbol("")
    setShowAddForm(false)
    success(`${symbol}이(가) 관심종목에 추가되었습니다`)
  }

  const handleRemove = (symbol: string) => {
    setWatchlist(watchlist.filter((w) => w.symbol !== symbol))
    success("관심종목에서 제거되었습니다")
  }

  const totalValue = watchlist.reduce((sum, item) => sum + item.price, 0)
  const avgChange = watchlist.reduce((sum, item) => sum + item.changePercent, 0) / watchlist.length

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">관심종목</h1>
              <p className="text-muted-foreground">추적하고 싶은 종목을 관리하세요</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all"
            >
              <Plus size={18} />
              추가
            </button>
          </div>
        </AnimateIn>

        {/* 추가 폼 */}
        {showAddForm && (
          <AnimateIn from="bottom" delay={80}>
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">관심종목 추가</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="종목 심볼 (예: AAPL, MSFT)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                  onKeyPress={(e) => e.key === "Enter" && handleAddToWatchlist()}
                />
                <button
                  onClick={handleAddToWatchlist}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                >
                  추가
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

        {/* 요약 카드 */}
        <AnimateIn from="bottom" delay={160}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-1">관심종목 수</p>
              <p className="text-3xl font-bold">{watchlist.length}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-1">총 가격</p>
              <p className="text-3xl font-bold">${totalValue.toFixed(2)}</p>
            </div>
            <div className={`bg-card border rounded-lg p-6 ${avgChange >= 0 ? "border-green-600" : "border-red-600"}`}>
              <p className="text-sm text-muted-foreground mb-1">평균 변화율</p>
              <p className={`text-3xl font-bold ${avgChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {avgChange >= 0 ? "+" : ""}{avgChange.toFixed(2)}%
              </p>
            </div>
          </div>
        </AnimateIn>

        {/* 관심종목 목록 */}
        <AnimateIn from="bottom" delay={240}>
          <div className="space-y-4">
            {watchlist.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <Star className="mx-auto mb-4 text-muted-foreground" size={32} />
                <p className="text-muted-foreground mb-4">아직 관심종목이 없습니다</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  첫 번째 종목 추가
                </button>
              </div>
            ) : (
              watchlist.map((item) => (
                <div key={item.symbol} className="bg-card border border-border rounded-lg p-6 hover:border-blue-600 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* 종목 정보 */}
                    <div>
                      <h3 className="text-2xl font-bold">{item.symbol}</h3>
                      <p className="text-sm text-muted-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-2">추가: {item.addedDate}</p>
                    </div>

                    {/* 가격 정보 */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">현재 가격</p>
                      <p className="text-2xl font-bold">${item.price.toFixed(2)}</p>
                      <p className={`text-sm font-semibold ${item.changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {item.changePercent >= 0 ? "▲" : "▼"} {item.changePercent.toFixed(2)}%
                      </p>
                    </div>

                    {/* 일일 범위 */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">일일 범위</p>
                      <div className="space-y-1">
                        <p className="text-sm">고: ${item.dayHigh.toFixed(2)}</p>
                        <p className="text-sm">저: ${item.dayLow.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* 52주 범위 & 액션 */}
                    <div className="flex flex-col items-end justify-between">
                      <div className="text-right mb-4">
                        <p className="text-sm text-muted-foreground mb-2">52주 범위</p>
                        <p className="text-sm">고: ${item["52WeekHigh"].toFixed(2)}</p>
                        <p className="text-sm">저: ${item["52WeekLow"].toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-muted rounded-lg transition-all" title="알람 설정">
                          <Bell size={18} className="text-blue-600" />
                        </button>
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
              ))
            )}
          </div>
        </AnimateIn>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
