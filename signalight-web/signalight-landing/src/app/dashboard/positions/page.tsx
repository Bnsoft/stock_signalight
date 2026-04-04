"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { TrendingUp, AlertCircle } from "lucide-react"

interface Position {
  id: number
  symbol: string
  quantity: number
  entry_price: number
  position_value: number
  position_pnl: number
  position_return: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function PositionsPage() {
  const { user, token } = useAuth()
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchPortfolio = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/portfolio/${user.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setPositions(data.positions)
        }
      } catch (err) {
        console.error("Failed to load positions")
      } finally {
        setLoading(false)
      }
    }

    fetchPortfolio()
  }, [user, token])

  if (loading) {
    return <div className="min-h-screen bg-background p-6 animate-pulse" />
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">포지션 분석</h1>
            <p className="text-muted-foreground">개별 포지션 상세 분석</p>
          </div>
        </AnimateIn>

        <AnimateIn from="bottom" delay={80}>
          <div className="space-y-4">
            {positions.length > 0 ? (
              positions.map((pos, idx) => {
                const breakEven = pos.entry_price
                const currentPrice = pos.position_value / pos.quantity
                const distanceToBreakeven =
                  ((currentPrice - breakEven) / breakEven) * 100

                return (
                  <div key={idx} className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold">{pos.symbol}</h3>
                        <p className="text-sm text-muted-foreground">
                          {pos.quantity.toLocaleString()} 주 | 진입가: ${pos.entry_price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${pos.position_value.toLocaleString()}
                        </p>
                        <p
                          className={`text-sm font-semibold ${
                            pos.position_return >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {pos.position_return.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    {/* Break-even Bar */}
                    <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">손익분기</span>
                        <span className="text-xs font-semibold">
                          {distanceToBreakeven.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            distanceToBreakeven >= 0
                              ? "bg-green-600"
                              : "bg-red-600"
                          }`}
                          style={{
                            width: `${Math.min(Math.abs(distanceToBreakeven), 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Risk Assessment */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          위험/보상
                        </p>
                        <p className="font-semibold">
                          1:{(pos.position_return * 2).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          진입 점수
                        </p>
                        <p className="font-semibold text-primary">
                          {Math.min(100, Math.max(0, 50 + pos.position_return / 2)).toFixed(
                            0
                          )}/100
                        </p>
                      </div>
                    </div>

                    {/* Alerts */}
                    {distanceToBreakeven < -10 && (
                      <div className="mt-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">
                          손실이 크니 주의하세요. 손절 고려 필요.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">포지션이 없습니다.</p>
              </div>
            )}
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}
