"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Zap, Plus, Trash2, Gauge, TrendingDown, Shield, History } from "lucide-react"

interface AutoTrade {
  id: number
  symbol: string
  trigger_condition: string
  trigger_value: number
  action: string
  quantity: number
  is_active: number
  created_at: string
}

interface ConditionalOrder {
  id: number
  symbol: string
  condition_type: string
  condition_value: number
  action_type: string
  quantity: number
  order_price: number
  status: string
}

interface HedgeSuggestion {
  symbol: string
  position: string
  quantity: number
  exposure: number
  hedge_recommendation: string
  hedge_details: any
  expected_protection: any
}

interface ExecutionHistory {
  trade_id: number
  symbol: string
  action: string
  quantity: number
  execution_price: number
  executed_at: string
  total_value: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AutoTradePage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [autoTrades, setAutoTrades] = useState<AutoTrade[]>([])
  const [conditionalOrders, setConditionalOrders] = useState<ConditionalOrder[]>([])
  const [hedgeSuggestions, setHedgeSuggestions] = useState<HedgeSuggestion[]>([])
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([])
  const [performance, setPerformance] = useState<any>(null)
  const [showAddRule, setShowAddRule] = useState(false)
  const [newRule, setNewRule] = useState({
    symbol: "",
    trigger_condition: "SIGNAL",
    trigger_value: 0,
    action: "BUY",
    quantity: 10
  })

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchAutoTradeData = async () => {
      try {
        // Fetch auto trades
        const tradesRes = await fetch(`${API_BASE}/api/auto-trades/${user.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (tradesRes.ok) {
          const data = await tradesRes.json()
          setAutoTrades(data.rules)
        }

        // Fetch conditional orders
        const ordersRes = await fetch(`${API_BASE}/api/conditional-orders/${user.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (ordersRes.ok) {
          const data = await ordersRes.json()
          setConditionalOrders(data.orders)
        }

        // Fetch hedging suggestions
        const hedgeRes = await fetch(`${API_BASE}/api/portfolio/${user.user_id}/hedging-suggestions`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (hedgeRes.ok) {
          const data = await hedgeRes.json()
          setHedgeSuggestions(data.suggestions)
        }

        // Fetch execution history
        const historyRes = await fetch(`${API_BASE}/api/auto-trades/${user.user_id}/execution-history`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (historyRes.ok) {
          const data = await historyRes.json()
          setExecutionHistory(data.history)
        }

        // Fetch performance
        const perfRes = await fetch(`${API_BASE}/api/auto-trades/${user.user_id}/performance`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (perfRes.ok) {
          const data = await perfRes.json()
          setPerformance(data)
        }
      } catch (err) {
        console.error("Failed to load auto-trade data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAutoTradeData()
  }, [user, token])

  const handleAddRule = async () => {
    if (!newRule.symbol || newRule.quantity <= 0) {
      alert("모든 필드를 입력하세요")
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/auto-trades?user_id=${user?.user_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newRule),
      })

      if (res.ok) {
        setNewRule({
          symbol: "",
          trigger_condition: "SIGNAL",
          trigger_value: 0,
          action: "BUY",
          quantity: 10
        })
        setShowAddRule(false)
        // Refetch
        const tradesRes = await fetch(`${API_BASE}/api/auto-trades/${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (tradesRes.ok) {
          const data = await tradesRes.json()
          setAutoTrades(data.rules)
        }
      }
    } catch (err: any) {
      alert("규칙 추가 실패: " + err.message)
    }
  }

  const handleDeleteRule = async (tradeId: number) => {
    if (!confirm("이 규칙을 삭제하시겠습니까?")) return

    try {
      const res = await fetch(`${API_BASE}/api/auto-trades/${tradeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setAutoTrades(autoTrades.filter(t => t.id !== tradeId))
      }
    } catch (err) {
      console.error("Failed to delete rule", err)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-background p-6 animate-pulse" />
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Zap className="w-8 h-8 text-yellow-500" />
                자동 거래 & 조건부 주문
              </h1>
              <p className="text-muted-foreground">
                신호 기반 자동 거래 및 포트폴리오 헤징
              </p>
            </div>
            <Button onClick={() => setShowAddRule(true)}>
              <Plus className="w-4 h-4 mr-2" />
              규칙 추가
            </Button>
          </div>
        </AnimateIn>

        {/* Performance Overview */}
        {performance && (
          <AnimateIn from="bottom" delay={40}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">총 거래</p>
                <p className="text-3xl font-bold">{performance.total_trades}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">승률</p>
                <p className="text-3xl font-bold text-green-600">
                  {performance.win_rate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">평균 수익률</p>
                <p className="text-3xl font-bold text-green-600">
                  {performance.avg_return.toFixed(2)}%
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">누적 수익률</p>
                <p className="text-3xl font-bold text-green-600">
                  {performance.total_return.toFixed(2)}%
                </p>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Auto Trade Rules */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              활성 자동 거래 규칙
            </h2>
            {autoTrades.length > 0 ? (
              <div className="space-y-3">
                {autoTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="flex items-start justify-between p-4 bg-muted/30 rounded border border-border"
                  >
                    <div>
                      <p className="font-bold">{trade.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {trade.trigger_condition} {trade.trigger_value} → {trade.action} {trade.quantity}주
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        생성: {new Date(trade.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          trade.is_active
                            ? "bg-green-500/20 text-green-600"
                            : "bg-gray-500/20 text-gray-600"
                        }`}
                      >
                        {trade.is_active ? "활성" : "비활성"}
                      </span>
                      <button
                        onClick={() => handleDeleteRule(trade.id)}
                        className="p-2 hover:bg-red-500/10 rounded text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6">
                활성 규칙이 없습니다. 새로운 규칙을 추가하세요.
              </p>
            )}
          </div>
        </AnimateIn>

        {/* Conditional Orders */}
        <AnimateIn from="bottom" delay={120}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-blue-500" />
              조건부 주문
            </h2>
            {conditionalOrders.length > 0 ? (
              <div className="space-y-3">
                {conditionalOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-start justify-between p-4 bg-muted/30 rounded border border-border"
                  >
                    <div>
                      <p className="font-bold">{order.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        IF {order.condition_type} {order.condition_value} THEN {order.action_type}{" "}
                        {order.quantity}주 @ ${order.order_price}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        order.status === "PENDING"
                          ? "bg-yellow-500/20 text-yellow-600"
                          : "bg-green-500/20 text-green-600"
                      }`}
                    >
                      {order.status === "PENDING" ? "대기중" : "실행됨"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-6">
                조건부 주문이 없습니다.
              </p>
            )}
          </div>
        </AnimateIn>

        {/* Hedging Suggestions */}
        {hedgeSuggestions.length > 0 && (
          <AnimateIn from="bottom" delay={160}>
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                헤징 제안
              </h2>
              <div className="space-y-3">
                {hedgeSuggestions.map((hedge, idx) => (
                  <div key={idx} className="p-4 bg-muted/30 rounded border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold">{hedge.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          현재 보유: {hedge.quantity}주
                        </p>
                      </div>
                      <Button size="sm">헤징 적용</Button>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-2">
                        제안: {hedge.hedge_recommendation}
                      </p>
                      <p className="text-xs text-green-600">
                        예상 보호: ${typeof hedge.expected_protection === 'number' ? hedge.expected_protection.toLocaleString() : hedge.expected_protection}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Execution History */}
        {executionHistory.length > 0 && (
          <AnimateIn from="bottom" delay={200}>
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                실행 이력 (최근 10건)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">심볼</th>
                      <th className="text-left p-2">액션</th>
                      <th className="text-right p-2">수량</th>
                      <th className="text-right p-2">가격</th>
                      <th className="text-right p-2">금액</th>
                      <th className="text-left p-2">시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executionHistory.slice(0, 10).map((exec, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="p-2 font-semibold">{exec.symbol}</td>
                        <td className={`p-2 ${exec.action === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                          {exec.action === 'BUY' ? '매수' : '매도'}
                        </td>
                        <td className="text-right p-2">{exec.quantity}</td>
                        <td className="text-right p-2">${exec.execution_price.toFixed(2)}</td>
                        <td className="text-right p-2">${exec.total_value.toLocaleString()}</td>
                        <td className="text-left p-2 text-muted-foreground text-xs">
                          {new Date(exec.executed_at).toLocaleString("ko-KR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Add Rule Dialog */}
        {showAddRule && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">자동 거래 규칙 추가</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">심볼</label>
                  <input
                    type="text"
                    value={newRule.symbol}
                    onChange={(e) => setNewRule({ ...newRule, symbol: e.target.value.toUpperCase() })}
                    placeholder="QQQ"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">트리거 조건</label>
                  <select
                    value={newRule.trigger_condition}
                    onChange={(e) =>
                      setNewRule({ ...newRule, trigger_condition: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  >
                    <option value="SIGNAL">신호</option>
                    <option value="PRICE">가격</option>
                    <option value="INDICATOR">지표</option>
                    <option value="TIME">시간</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">트리거 값</label>
                  <input
                    type="number"
                    value={newRule.trigger_value}
                    onChange={(e) =>
                      setNewRule({ ...newRule, trigger_value: Number(e.target.value) })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">액션</label>
                    <select
                      value={newRule.action}
                      onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                      className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                    >
                      <option value="BUY">매수</option>
                      <option value="SELL">매도</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">수량</label>
                    <input
                      type="number"
                      value={newRule.quantity}
                      onChange={(e) =>
                        setNewRule({ ...newRule, quantity: Number(e.target.value) })
                      }
                      placeholder="10"
                      className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button onClick={handleAddRule} className="flex-1">
                  추가
                </Button>
                <Button onClick={() => setShowAddRule(false)} variant="outline" className="flex-1">
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
