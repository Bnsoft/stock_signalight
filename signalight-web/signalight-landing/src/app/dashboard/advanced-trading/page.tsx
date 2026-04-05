"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Plus, Edit2, Trash2, AlertCircle, TrendingUp } from "lucide-react"

interface AdvancedOrder {
  id: string
  type: "OCO" | "CONDITIONAL" | "BRACKET" | "SCALE"
  symbol: string
  quantity: number
  status: "ACTIVE" | "PENDING" | "FILLED" | "CANCELLED"
  createdAt: string
  details: any
}

type OrderTab = "oco" | "conditional" | "bracket" | "scale" | "recommendations"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AdvancedTradingPage() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<OrderTab>("oco")
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<AdvancedOrder[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedOrderType, setSelectedOrderType] = useState<"OCO" | "CONDITIONAL" | "BRACKET" | "SCALE">("OCO")

  useEffect(() => {
    if (!user?.user_id || !token) return
    fetchAdvancedOrders()
  }, [user, token])

  const fetchAdvancedOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/advanced-orders/${user?.user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        const allOrders = [
          ...(data.oco_orders || []).map((o: any) => ({ ...o, type: "OCO" })),
          ...(data.conditional_orders || []).map((o: any) => ({ ...o, type: "CONDITIONAL" })),
          ...(data.bracket_orders || []).map((o: any) => ({ ...o, type: "BRACKET" })),
          ...(data.scale_orders || []).map((o: any) => ({ ...o, type: "SCALE" })),
        ]
        setOrders(allOrders)
      }
    } catch (err) {
      console.error("Failed to fetch advanced orders:", err)
    } finally {
      setLoading(false)
    }
  }

  const TabButton = ({ tab, label }: { tab: OrderTab; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 rounded-lg transition-all text-sm ${
        activeTab === tab
          ? "bg-blue-600 text-white"
          : "bg-muted text-foreground hover:bg-muted/80"
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">고급 거래</h1>
              <p className="text-muted-foreground">
                OCO, 조건부, 괄호, 스케일 주문 관리
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all"
            >
              <Plus size={18} />
              새 주문
            </button>
          </div>
        </AnimateIn>

        {/* Create Form */}
        {showCreateForm && (
          <AnimateIn from="bottom" delay={80}>
            <CreateAdvancedOrderForm onClose={() => setShowCreateForm(false)} />
          </AnimateIn>
        )}

        {/* Tab Navigation */}
        <AnimateIn from="bottom" delay={160}>
          <div className="mb-8 bg-card border border-border rounded-lg p-4 flex gap-2 flex-wrap">
            <TabButton tab="oco" label="OCO 주문" />
            <TabButton tab="conditional" label="조건부 주문" />
            <TabButton tab="bracket" label="괄호 주문" />
            <TabButton tab="scale" label="스케일 주문" />
            <TabButton tab="recommendations" label="전략 추천" />
          </div>
        </AnimateIn>

        {/* Content */}
        <AnimateIn from="bottom" delay={240}>
          <div>
            {loading ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center animate-pulse">
                <p className="text-muted-foreground">데이터 로딩 중...</p>
              </div>
            ) : activeTab === "oco" ? (
              <OrderListView
                orders={orders.filter((o) => o.type === "OCO")}
                orderType="OCO"
              />
            ) : activeTab === "conditional" ? (
              <OrderListView
                orders={orders.filter((o) => o.type === "CONDITIONAL")}
                orderType="CONDITIONAL"
              />
            ) : activeTab === "bracket" ? (
              <OrderListView
                orders={orders.filter((o) => o.type === "BRACKET")}
                orderType="BRACKET"
              />
            ) : activeTab === "scale" ? (
              <OrderListView
                orders={orders.filter((o) => o.type === "SCALE")}
                orderType="SCALE"
              />
            ) : (
              <StrategyRecommendations />
            )}
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}

function CreateAdvancedOrderForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    symbol: "SPY",
    quantity: 100,
    orderType: "OCO" as const,
    primaryPrice: 450,
    secondaryPrice: 440,
  })

  const handleSubmit = async () => {
    // API call to create order
    onClose()
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-6">새로운 고급 주문</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-2">주문 타입</label>
          <select
            value={formData.orderType}
            onChange={(e) => setFormData({ ...formData, orderType: e.target.value as any })}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          >
            <option value="OCO">OCO (One Cancels Other)</option>
            <option value="CONDITIONAL">조건부 주문</option>
            <option value="BRACKET">괄호 주문</option>
            <option value="SCALE">스케일 주문</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">종목</label>
          <input
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
            placeholder="SPY"
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">수량</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Primary Price</label>
          <input
            type="number"
            value={formData.primaryPrice}
            onChange={(e) => setFormData({ ...formData, primaryPrice: parseFloat(e.target.value) })}
            step="0.01"
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          />
        </div>
      </div>

      {formData.orderType === "OCO" && (
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Secondary Price (Stop Loss)</label>
          <input
            type="number"
            value={formData.secondaryPrice}
            onChange={(e) => setFormData({ ...formData, secondaryPrice: parseFloat(e.target.value) })}
            step="0.01"
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all"
        >
          주문 생성
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 rounded-lg transition-all"
        >
          취소
        </button>
      </div>
    </div>
  )
}

function OrderListView({ orders, orderType }: { orders: any[]; orderType: string }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">활성 {orderType} 주문이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order, idx) => (
        <div key={idx} className="bg-card border border-border rounded-lg p-6 hover:border-blue-600 transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">{order.symbol}</h3>
              <p className="text-sm text-muted-foreground">{order.quantity}주</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  order.status === "ACTIVE"
                    ? "bg-green-600/20 text-green-600"
                    : order.status === "PENDING"
                    ? "bg-yellow-600/20 text-yellow-600"
                    : "bg-gray-600/20 text-gray-600"
                }`}
              >
                {order.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {orderType === "OCO" && (
              <>
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground">이익실현</p>
                  <p className="text-lg font-bold text-green-600">
                    ${order.details?.primary_price || order.price || "N/A"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground">손절가</p>
                  <p className="text-lg font-bold text-red-600">
                    ${order.details?.secondary_price || "N/A"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{new Date(order.createdAt || order.created_at).toLocaleString("ko-KR")}</span>
            <div className="flex gap-2">
              <button className="text-blue-600 hover:text-blue-700">
                <Edit2 size={16} />
              </button>
              <button className="text-red-600 hover:text-red-700">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StrategyRecommendations() {
  const recommendations = [
    {
      name: "보수적 괄호 주문",
      description: "안정적인 진입과 손절가 설정",
      entryPrice: 450,
      takeProfit: 460,
      stopLoss: 440,
      riskReward: 2.0,
    },
    {
      name: "공격적 스케일 진입",
      description: "4단계로 나누어 단계적 진입",
      steps: 4,
      totalQuantity: 400,
      description2: "리스크 분산과 평균 단가 낮춤",
    },
    {
      name: "OCO 이익실현/손절",
      description: "자동 이익실현 및 손절 설정",
      profitTarget: 460,
      stopLoss: 440,
      riskRewardRatio: 2.5,
    },
  ]

  return (
    <div className="space-y-4">
      {recommendations.map((rec, idx) => (
        <div key={idx} className="bg-card border border-border rounded-lg p-6 hover:border-blue-600 transition-all cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold mb-1">{rec.name}</h3>
              <p className="text-sm text-muted-foreground">{rec.description}</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">
              적용
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {"entryPrice" in rec && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">진입가</p>
                <p className="text-lg font-bold">${rec.entryPrice}</p>
              </div>
            )}
            {"takeProfit" in rec && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">익절가</p>
                <p className="text-lg font-bold text-green-600">${rec.takeProfit}</p>
              </div>
            )}
            {"stopLoss" in rec && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">손절가</p>
                <p className="text-lg font-bold text-red-600">${rec.stopLoss}</p>
              </div>
            )}
            {"riskReward" in rec && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">위험/수익</p>
                <p className="text-lg font-bold text-blue-600">1:{rec.riskReward}</p>
              </div>
            )}
            {"steps" in rec && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">단계</p>
                <p className="text-lg font-bold">{rec.steps}단계</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
