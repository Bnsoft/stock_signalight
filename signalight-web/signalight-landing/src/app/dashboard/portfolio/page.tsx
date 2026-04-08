"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Plus, TrendingUp, DollarSign } from "lucide-react"

interface Portfolio {
  total_value: number
  total_cost: number
  total_pnl: number
  total_return: number
  positions_count: number
  positions: Array<{
    symbol: string
    quantity: number
    position_value: number
    position_return: number
    position_cost?: number
    avg_price?: number
    current_price?: number
  }>
  sharpe_ratio: number
  max_drawdown: number
}

interface HistoryPoint {
  recorded_at: string
  total_value: number
  daily_pnl: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export default function PortfolioPage() {
  const { user, token } = useAuth()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddPosition, setShowAddPosition] = useState(false)

  const [newPosition, setNewPosition] = useState({
    symbol: "",
    quantity: 0,
    entry_price: 0,
  })

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchPortfolio = async () => {
      try {
        const [portfolioRes, historyRes] = await Promise.all([
          fetch(`${API_BASE}/api/portfolio/${user.user_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/portfolio/${user.user_id}/history`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (portfolioRes.ok) {
          const data = await portfolioRes.json()
          setPortfolio(data)
        }

        if (historyRes.ok) {
          const data = await historyRes.json()
          setHistory(data.history)
        }
      } catch (err: any) {
        setError(err.message || "Failed to load portfolio")
      } finally {
        setLoading(false)
      }
    }

    fetchPortfolio()
  }, [user, token])

  const handleAddPosition = async () => {
    if (!newPosition.symbol || newPosition.quantity <= 0 || newPosition.entry_price <= 0) {
      alert("Please fill all fields")
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/portfolio/positions?user_id=${user?.user_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPosition),
      })

      if (res.ok) {
        setNewPosition({ symbol: "", quantity: 0, entry_price: 0 })
        setShowAddPosition(false)
        // Refetch portfolio
        const portfolioRes = await fetch(`${API_BASE}/api/portfolio/${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (portfolioRes.ok) {
          const data = await portfolioRes.json()
          setPortfolio(data)
        }
      }
    } catch (err: any) {
      alert("Failed to add position: " + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-40 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  const chartData = portfolio?.positions.map((p) => ({
    name: p.symbol,
    value: p.position_value,
  })) || []

  const chartColorIndex = portfolio?.positions.length || 0

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">포트폴리오</h1>
              <p className="text-muted-foreground">투자 포지션 및 성과 추적</p>
            </div>
            <Button onClick={() => setShowAddPosition(true)}>
              <Plus className="w-4 h-4 mr-2" />
              포지션 추가
            </Button>
          </div>
        </AnimateIn>

        {error && (
          <AnimateIn from="bottom">
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          </AnimateIn>
        )}

        {portfolio && (
          <>
            {/* Overview Cards */}
            <AnimateIn from="bottom" delay={80}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <p className="text-xs text-muted-foreground mb-1">총 자산</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${portfolio.total_value.toLocaleString()}
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <p className="text-xs text-muted-foreground mb-1">총 손익</p>
                  <p
                    className={`text-2xl font-bold ${
                      portfolio.total_pnl >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    ${portfolio.total_pnl.toLocaleString()}
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <p className="text-xs text-muted-foreground mb-1">수익률</p>
                  <p
                    className={`text-2xl font-bold ${
                      portfolio.total_return >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {portfolio.total_return.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-6">
                  <p className="text-xs text-muted-foreground mb-1">포지션 수</p>
                  <p className="text-2xl font-bold">{portfolio.positions_count}</p>
                </div>
              </div>
            </AnimateIn>

            {/* Charts */}
            <AnimateIn from="bottom" delay={160}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Asset Allocation */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">자산 배분</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Performance History */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">성과 변화</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="recorded_at" stroke="#999" />
                        <YAxis stroke="#999" />
                        <Tooltip
                          formatter={(value) => `$${Number(value).toLocaleString()}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="total_value"
                          stroke="#10b981"
                          dot={false}
                          name="총 자산"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* Positions Table */}
            <AnimateIn from="bottom" delay={240}>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">포지션</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4">종목</th>
                        <th className="text-right py-3 px-4">수량</th>
                        <th className="text-right py-3 px-4">종가</th>
                        <th className="text-right py-3 px-4">현재가</th>
                        <th className="text-right py-3 px-4">현재 가치</th>
                        <th className="text-right py-3 px-4">수익률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.positions.map((pos, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-4 font-mono font-semibold">{pos.symbol}</td>
                          <td className="text-right py-3 px-4">{pos.quantity.toLocaleString()}</td>
                          <td className="text-right py-3 px-4 font-mono">
                            ${(pos.position_cost ?? 0) / pos.quantity > 0
                              ? ((pos.position_cost ?? 0) / pos.quantity).toFixed(2)
                              : "0.00"}
                          </td>
                          <td className="text-right py-3 px-4 font-mono text-green-600 font-semibold">
                            ${(pos.position_value / pos.quantity).toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4 font-semibold">
                            ${pos.position_value.toLocaleString()}
                          </td>
                          <td
                            className={`text-right py-3 px-4 font-semibold ${
                              pos.position_return >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {pos.position_return.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </AnimateIn>
          </>
        )}

        {/* Add Position Dialog */}
        {showAddPosition && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">포지션 추가</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">종목 (예: QQQ)</label>
                  <input
                    type="text"
                    value={newPosition.symbol}
                    onChange={(e) =>
                      setNewPosition({ ...newPosition, symbol: e.target.value.toUpperCase() })
                    }
                    placeholder="QQQ"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">수량</label>
                  <input
                    type="number"
                    value={newPosition.quantity}
                    onChange={(e) =>
                      setNewPosition({ ...newPosition, quantity: Number(e.target.value) })
                    }
                    placeholder="10"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">진입가</label>
                  <input
                    type="number"
                    value={newPosition.entry_price}
                    onChange={(e) =>
                      setNewPosition({ ...newPosition, entry_price: Number(e.target.value) })
                    }
                    placeholder="590"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button onClick={handleAddPosition} className="flex-1">
                  추가
                </Button>
                <Button onClick={() => setShowAddPosition(false)} variant="outline" className="flex-1">
                  취소
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
