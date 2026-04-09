"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Plus, X, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"

interface CompareItem {
  symbol: string
  price: number | null
  rsi?: number
  ma_20?: number
  ma_60?: number
  volume_ratio?: number
  adx?: number
  atr?: number
  change_pct?: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function ComparePage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()
  const [compareData, setCompareData] = useState<CompareItem[]>([])
  const [newSymbol, setNewSymbol] = useState("")
  const [loadingSymbol, setLoadingSymbol] = useState("")

  const handleAddSymbol = async () => {
    const sym = newSymbol.trim().toUpperCase()
    if (!sym) { showError("종목 심볼을 입력하세요"); return }
    if (compareData.find((d) => d.symbol === sym)) { showError("이미 추가된 종목입니다"); return }
    if (compareData.length >= 5) { showError("최대 5개까지 비교 가능합니다"); return }

    setLoadingSymbol(sym)
    try {
      const res = await fetch(`${API_BASE}/api/quote/${sym}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`${sym} 데이터를 가져오지 못했습니다`)
      const data = await res.json()
      const ind = data.indicators || {}

      setCompareData((prev) => [
        ...prev,
        {
          symbol: sym,
          price: data.price ?? null,
          rsi: ind.rsi_14,
          ma_20: ind.ma_20,
          ma_60: ind.ma_60,
          volume_ratio: ind.volume_ratio,
          adx: ind.adx,
          atr: ind.atr,
          change_pct: ind.change_pct,
        },
      ])
      success(`${sym} 추가됨`)
      setNewSymbol("")
    } catch (e: any) {
      showError(e.message || "데이터 로드 실패")
    } finally {
      setLoadingSymbol("")
    }
  }

  const handleRefresh = async (sym: string) => {
    setLoadingSymbol(sym)
    try {
      const res = await fetch(`${API_BASE}/api/quote/${sym}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("갱신 실패")
      const data = await res.json()
      const ind = data.indicators || {}
      setCompareData((prev) =>
        prev.map((item) =>
          item.symbol === sym
            ? { ...item, price: data.price ?? null, rsi: ind.rsi_14, ma_20: ind.ma_20, ma_60: ind.ma_60, volume_ratio: ind.volume_ratio, adx: ind.adx, atr: ind.atr, change_pct: ind.change_pct }
            : item
        )
      )
    } catch {
      showError("갱신 실패")
    } finally {
      setLoadingSymbol("")
    }
  }

  const metrics: { label: string; render: (item: CompareItem) => string; color?: (item: CompareItem) => string }[] = [
    { label: "현재 가격",   render: (i) => i.price != null ? `$${i.price.toFixed(2)}` : "—" },
    { label: "RSI (14)",    render: (i) => i.rsi != null ? i.rsi.toFixed(1) : "—", color: (i) => i.rsi != null ? (i.rsi < 30 ? "text-green-600" : i.rsi > 70 ? "text-red-600" : "") : "" },
    { label: "MA 20",       render: (i) => i.ma_20 != null ? `$${i.ma_20.toFixed(2)}` : "—" },
    { label: "MA 60",       render: (i) => i.ma_60 != null ? `$${i.ma_60.toFixed(2)}` : "—" },
    { label: "거래량 비율", render: (i) => i.volume_ratio != null ? `${i.volume_ratio.toFixed(2)}×` : "—", color: (i) => i.volume_ratio != null && i.volume_ratio > 1.5 ? "text-blue-600" : "" },
    { label: "ADX",         render: (i) => i.adx != null ? i.adx.toFixed(1) : "—", color: (i) => i.adx != null && i.adx > 25 ? "text-green-600" : "" },
    { label: "ATR",         render: (i) => i.atr != null ? `$${i.atr.toFixed(2)}` : "—" },
  ]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">종목 비교</h1>
            <p className="text-muted-foreground">최대 5개 종목 실시간 지표 비교 · yfinance</p>
          </div>
        </AnimateIn>

        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">종목 추가</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="종목 심볼 (예: AAPL, QQQ)"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
                className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
              />
              <button
                onClick={handleAddSymbol}
                disabled={!!loadingSymbol || compareData.length >= 5}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white font-bold rounded-lg transition-all flex items-center gap-2"
              >
                {loadingSymbol && !compareData.find((d) => d.symbol === loadingSymbol) ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                추가
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {compareData.map((item) => (
                <div key={item.symbol} className="flex items-center gap-2 bg-blue-600/10 border border-blue-600 rounded-full px-4 py-1.5">
                  <span className="font-bold text-blue-600 text-sm">{item.symbol}</span>
                  <button
                    onClick={() => handleRefresh(item.symbol)}
                    disabled={loadingSymbol === item.symbol}
                    className="text-blue-600 hover:text-blue-800"
                    title="갱신"
                  >
                    <RefreshCw size={12} className={loadingSymbol === item.symbol ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => setCompareData(compareData.filter((d) => d.symbol !== item.symbol))}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </AnimateIn>

        {compareData.length > 0 && (
          <AnimateIn from="bottom" delay={160}>
            <div className="bg-card border border-border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-4 text-left text-sm font-bold w-36">지표</th>
                    {compareData.map((item) => (
                      <th key={item.symbol} className="px-6 py-4 text-center text-sm font-bold min-w-32">
                        {item.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.map((metric) => (
                    <tr key={metric.label} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-muted-foreground">{metric.label}</td>
                      {compareData.map((item) => (
                        <td
                          key={item.symbol}
                          className={`px-6 py-4 text-center text-sm font-bold ${metric.color?.(item) || ""}`}
                        >
                          {metric.render(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimateIn>
        )}

        {compareData.length === 0 && (
          <AnimateIn from="bottom" delay={160}>
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <p className="text-muted-foreground mb-2">비교할 종목을 추가하세요</p>
              <p className="text-sm text-muted-foreground">심볼 입력 후 Enter 또는 추가 버튼</p>
            </div>
          </AnimateIn>
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
