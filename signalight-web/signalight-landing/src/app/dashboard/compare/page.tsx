"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Plus, X } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"

interface CompareItem {
  symbol: string
  price: number
  pe: number
  pb: number
  dividend: number
  roe: number
  roa: number
  debt: number
  eps: number
  revenue: string
  priceChange1D: number
  priceChange1M: number
  priceChange1Y: number
}

const MOCK_DATA: { [key: string]: CompareItem } = {
  AAPL: {
    symbol: "AAPL",
    price: 175.45,
    pe: 28.5,
    pb: 45.2,
    dividend: 0.94,
    roe: 88.3,
    roa: 16.5,
    debt: 0.85,
    eps: 6.15,
    revenue: "383.3B",
    priceChange1D: 1.36,
    priceChange1M: 5.2,
    priceChange1Y: 28.5,
  },
  MSFT: {
    symbol: "MSFT",
    price: 380.25,
    pe: 32.1,
    pb: 12.5,
    dividend: 2.72,
    roe: 37.4,
    roa: 12.8,
    debt: 0.45,
    eps: 11.84,
    revenue: "198.3B",
    priceChange1D: -0.33,
    priceChange1M: 3.1,
    priceChange1Y: 32.8,
  },
  GOOGL: {
    symbol: "GOOGL",
    price: 140.50,
    pe: 24.3,
    pb: 3.8,
    dividend: 0.0,
    roe: 15.2,
    roa: 10.3,
    debt: 0.12,
    eps: 5.78,
    revenue: "282.8B",
    priceChange1D: 2.29,
    priceChange1M: 8.5,
    priceChange1Y: 45.2,
  },
}

export default function ComparePage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["AAPL", "MSFT"])
  const [newSymbol, setNewSymbol] = useState("")

  const handleAddSymbol = () => {
    const symbol = newSymbol.toUpperCase()
    if (!symbol) {
      showError("종목 심볼을 입력하세요")
      return
    }
    if (!MOCK_DATA[symbol]) {
      showError("존재하지 않는 종목입니다")
      return
    }
    if (selectedSymbols.includes(symbol)) {
      showError("이미 추가된 종목입니다")
      return
    }
    if (selectedSymbols.length >= 5) {
      showError("최대 5개까지만 비교할 수 있습니다")
      return
    }
    setSelectedSymbols([...selectedSymbols, symbol])
    setNewSymbol("")
    success(`${symbol}이(가) 추가되었습니다`)
  }

  const compareData = selectedSymbols.map((symbol) => MOCK_DATA[symbol]).filter(Boolean)

  const metrics = [
    { label: "현재 가격", key: "price", format: (v: number) => `$${v.toFixed(2)}` },
    { label: "P/E 비율", key: "pe", format: (v: number) => v.toFixed(2) },
    { label: "P/B 비율", key: "pb", format: (v: number) => v.toFixed(2) },
    { label: "배당금", key: "dividend", format: (v: number) => `$${v.toFixed(2)}` },
    { label: "ROE (%)", key: "roe", format: (v: number) => v.toFixed(1) },
    { label: "ROA (%)", key: "roa", format: (v: number) => v.toFixed(1) },
    { label: "부채 비율", key: "debt", format: (v: number) => v.toFixed(2) },
    { label: "EPS", key: "eps", format: (v: number) => `$${v.toFixed(2)}` },
    { label: "매출", key: "revenue", format: (v: string) => v },
    { label: "1일 변화", key: "priceChange1D", format: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%` },
    { label: "1개월 변화", key: "priceChange1M", format: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%` },
    { label: "1년 변화", key: "priceChange1Y", format: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}%` },
  ]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">종목 비교</h1>
            <p className="text-muted-foreground">최대 5개 종목을 기술적/재무적 지표로 비교하세요</p>
          </div>
        </AnimateIn>

        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">비교할 종목 선택</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="종목 심볼 (예: AAPL, MSFT)"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                onKeyPress={(e) => e.key === "Enter" && handleAddSymbol()}
              />
              <button
                onClick={handleAddSymbol}
                disabled={selectedSymbols.length >= 5}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white font-bold rounded-lg transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                추가
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedSymbols.map((symbol) => (
                <div key={symbol} className="flex items-center gap-2 bg-blue-600/10 border border-blue-600 rounded-full px-4 py-2">
                  <span className="font-bold text-blue-600">{symbol}</span>
                  <button
                    onClick={() => setSelectedSymbols(selectedSymbols.filter((s) => s !== symbol))}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <X size={16} />
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
                    <th className="px-6 py-4 text-left text-sm font-bold w-32">지표</th>
                    {compareData.map((item) => (
                      <th key={item.symbol} className="px-6 py-4 text-center text-sm font-bold min-w-32">
                        {item.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.map((metric) => (
                    <tr key={metric.key} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold">{metric.label}</td>
                      {compareData.map((item) => {
                        const value = (item as any)[metric.key]
                        const formatted = metric.format(value)
                        const isPercentage = metric.key.includes("priceChange")
                        const isPositive = isPercentage && parseFloat(formatted) > 0

                        return (
                          <td
                            key={item.symbol}
                            className={`px-6 py-4 text-center text-sm font-bold ${
                              isPositive ? "text-green-600" : isPercentage && parseFloat(formatted) < 0 ? "text-red-600" : ""
                            }`}
                          >
                            {formatted}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimateIn>
        )}

        {compareData.length === 0 && (
          <AnimateIn from="bottom" delay={160}>
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground mb-4">비교할 종목을 선택하세요</p>
              <p className="text-sm text-muted-foreground">사용 가능: AAPL, MSFT, GOOGL</p>
            </div>
          </AnimateIn>
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
