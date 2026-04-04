"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"

interface RebalanceSuggestion {
  total_value: number
  trades: Array<{
    symbol: string
    current_pct: number
    target_pct: number
    action: "buy" | "sell"
    quantity: number
    estimated_value: number
  }>
  estimated_cost: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function RebalancePage() {
  const { user, token } = useAuth()
  const [suggestion, setSuggestion] = useState<RebalanceSuggestion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchSuggestion = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/portfolio/${user.user_id}/rebalance-suggestion`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setSuggestion(data)
        }
      } catch (err) {
        console.error("Failed to load rebalancing suggestion")
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestion()
  }, [user, token])

  if (loading) {
    return <div className="min-h-screen bg-background p-6 animate-pulse" />
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">포트폴리오 리밸런싱</h1>
            <p className="text-muted-foreground">목표 배분에 맞춰 포트폴리오 조정</p>
          </div>
        </AnimateIn>

        {suggestion && suggestion.trades.length > 0 ? (
          <AnimateIn from="bottom" delay={80}>
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-6">
                <h3 className="font-semibold mb-4">리밸런싱 요약</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">총 자산</p>
                    <p className="text-xl font-bold">${suggestion.total_value.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">거래 수</p>
                    <p className="text-xl font-bold">{suggestion.trades.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">예상 비용</p>
                    <p className="text-xl font-bold">${suggestion.estimated_cost.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Trades Table */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold mb-4">제안 거래</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4">종목</th>
                        <th className="text-center py-3 px-4">현재</th>
                        <th className="text-center py-3 px-4">목표</th>
                        <th className="text-center py-3 px-4">변경</th>
                        <th className="text-center py-3 px-4">액션</th>
                        <th className="text-right py-3 px-4">수량</th>
                        <th className="text-right py-3 px-4">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestion.trades.map((trade, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-3 px-4 font-semibold">{trade.symbol}</td>
                          <td className="text-center py-3 px-4">{trade.current_pct.toFixed(1)}%</td>
                          <td className="text-center py-3 px-4">{trade.target_pct.toFixed(1)}%</td>
                          <td className="text-center py-3 px-4">{trade.diff_pct.toFixed(1)}%</td>
                          <td className="text-center py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                trade.action === "buy"
                                  ? "bg-green-500/20 text-green-600"
                                  : "bg-red-500/20 text-red-600"
                              }`}
                            >
                              {trade.action === "buy" ? "매수" : "매도"}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4 font-mono">
                            {trade.quantity.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4 font-semibold">
                            ${trade.estimated_value.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Button className="w-full" size="lg">
                리밸런싱 실행
              </Button>
            </div>
          </AnimateIn>
        ) : (
          <AnimateIn from="bottom" delay={80}>
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <p className="text-muted-foreground mb-4">리밸런싱이 필요하지 않습니다.</p>
              <p className="text-sm text-muted-foreground">포트폴리오가 목표 배분에 잘 맞춰있습니다.</p>
            </div>
          </AnimateIn>
        )}
      </div>
    </div>
  )
}
