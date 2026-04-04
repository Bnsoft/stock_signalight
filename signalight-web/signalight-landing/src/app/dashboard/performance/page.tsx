"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface PerformanceMetrics {
  total_value: number
  total_return: number
  sharpe_ratio: number
  max_drawdown: number
  monthly_returns: Record<string, { pnl: number; count: number }>
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function PerformancePage() {
  const { user, token } = useAuth()
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/performance/${user.user_id}/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setMetrics(data)
        }
      } catch (err) {
        console.error("Failed to load performance metrics")
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [user, token])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    )
  }

  const monthlyData = metrics?.monthly_returns
    ? Object.entries(metrics.monthly_returns).map(([month, data]) => ({
        month,
        return: data.pnl / (data.count || 1),
      }))
    : []

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">성과 분석</h1>
            <p className="text-muted-foreground">포트폴리오 성과 지표 및 분석</p>
          </div>
        </AnimateIn>

        {metrics && (
          <>
            {/* Key Metrics */}
            <AnimateIn from="bottom" delay={80}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/30 rounded-lg p-6">
                  <p className="text-xs text-muted-foreground mb-1">총 수익률</p>
                  <p className="text-3xl font-bold text-green-600">
                    {metrics.total_return.toFixed(2)}%
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-lg p-6">
                  <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {metrics.sharpe_ratio.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    높을수록 좋음 (목표: 1.0+)
                  </p>
                </div>

                <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30 rounded-lg p-6">
                  <p className="text-xs text-muted-foreground mb-1">Max Drawdown</p>
                  <p className="text-3xl font-bold text-red-600">
                    {metrics.max_drawdown.toFixed(2)}%
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-lg p-6">
                  <p className="text-xs text-muted-foreground mb-1">현재 자산</p>
                  <p className="text-3xl font-bold text-purple-600">
                    ${metrics.total_value.toLocaleString()}
                  </p>
                </div>
              </div>
            </AnimateIn>

            {/* Monthly Returns */}
            <AnimateIn from="bottom" delay={160}>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">월별 수익률</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#999" />
                      <YAxis stroke="#999" />
                      <Tooltip formatter={(value) => `${(value as number).toFixed(2)}%`} />
                      <Bar dataKey="return" fill="#10b981" name="월별 수익률" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </AnimateIn>

            {/* Performance Explanation */}
            <AnimateIn from="bottom" delay={240}>
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h4 className="font-semibold mb-3">성과 지표 설명</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>
                      <strong>총 수익률:</strong> 초기 투자금 대비 현재 수익 비율
                    </li>
                    <li>
                      <strong>Sharpe Ratio:</strong> 위험 대비 수익을 나타내는 지표 (높을수록
                      좋음)
                    </li>
                    <li>
                      <strong>Max Drawdown:</strong> 최고점에서 가장 낮은 점까지의 하락률
                    </li>
                  </ul>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <h4 className="font-semibold mb-3">개선 팁</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>✓ 다양한 종목으로 포트폴리오 분산</li>
                    <li>✓ 정기적으로 리밸런싱 실행</li>
                    <li>✓ 손절매와 익절 규칙 설정</li>
                  </ul>
                </div>
              </div>
            </AnimateIn>
          </>
        )}
      </div>
    </div>
  )
}
