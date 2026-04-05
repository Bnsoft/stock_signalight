"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Plus, Settings, Unlink, Check, AlertCircle, TrendingUp, DollarSign } from "lucide-react"

interface BrokerConnection {
  id: string
  broker: "INTERACTIVE_BROKERS" | "ALPACA" | "TD_AMERITRADE"
  account_id: string
  status: "CONNECTED" | "DISCONNECTED" | "ERROR"
  connected_at: string
}

interface BrokerAccount {
  broker: string
  account_id: string
  total_equity: number
  buying_power: number
  cash_balance: number
  portfolio_value: number
  positions_count: number
}

type Tab = "connections" | "accounts" | "positions" | "orders" | "performance"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function BrokerIntegrationPage() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("connections")
  const [loading, setLoading] = useState(false)
  const [connections, setConnections] = useState<BrokerConnection[]>([])
  const [accounts, setAccounts] = useState<BrokerAccount[]>([])
  const [showConnectForm, setShowConnectForm] = useState(false)
  const [selectedBroker, setSelectedBroker] = useState<"INTERACTIVE_BROKERS" | "ALPACA" | "TD_AMERITRADE">("ALPACA")
  const [formData, setFormData] = useState({
    apiKey: "",
    apiSecret: "",
    accountId: "",
  })

  useEffect(() => {
    if (!user?.user_id || !token) return
    fetchBrokerData()
  }, [user, token])

  const fetchBrokerData = async () => {
    setLoading(true)
    try {
      const [connRes, accRes] = await Promise.all([
        fetch(`${API_BASE}/api/broker/connections/${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/broker/accounts/${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (connRes.ok) {
        const data = await connRes.json()
        setConnections(data.connections || [])
      }

      if (accRes.ok) {
        const data = await accRes.json()
        setAccounts(data.accounts || [])
      }
    } catch (err) {
      console.error("Failed to fetch broker data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectBroker = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/broker/connect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.user_id,
          broker_type: selectedBroker,
          api_key: formData.apiKey,
          api_secret: formData.apiSecret,
          account_id: formData.accountId,
        }),
      })

      if (res.ok) {
        setFormData({ apiKey: "", apiSecret: "", accountId: "" })
        setShowConnectForm(false)
        fetchBrokerData()
      }
    } catch (err) {
      console.error("Failed to connect broker:", err)
    }
  }

  const TabButton = ({ tab, label }: { tab: Tab; label: string }) => (
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
              <h1 className="text-3xl font-bold mb-2">브로커 통합</h1>
              <p className="text-muted-foreground">
                Interactive Brokers, Alpaca, TD Ameritrade 연결
              </p>
            </div>
            <button
              onClick={() => setShowConnectForm(!showConnectForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all"
            >
              <Plus size={18} />
              브로커 연결
            </button>
          </div>
        </AnimateIn>

        {/* Connection Form */}
        {showConnectForm && (
          <AnimateIn from="bottom" delay={80}>
            <BrokerConnectionForm
              selectedBroker={selectedBroker}
              setSelectedBroker={setSelectedBroker}
              formData={formData}
              setFormData={setFormData}
              onConnect={handleConnectBroker}
              onCancel={() => setShowConnectForm(false)}
            />
          </AnimateIn>
        )}

        {/* Tab Navigation */}
        <AnimateIn from="bottom" delay={160}>
          <div className="mb-8 bg-card border border-border rounded-lg p-4 flex gap-2 flex-wrap">
            <TabButton tab="connections" label="연결 상태" />
            <TabButton tab="accounts" label="계정" />
            <TabButton tab="positions" label="포지션" />
            <TabButton tab="orders" label="주문" />
            <TabButton tab="performance" label="성과" />
          </div>
        </AnimateIn>

        {/* Content */}
        <AnimateIn from="bottom" delay={240}>
          <div>
            {loading ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center animate-pulse">
                <p className="text-muted-foreground">데이터 로딩 중...</p>
              </div>
            ) : activeTab === "connections" ? (
              <ConnectionsView connections={connections} />
            ) : activeTab === "accounts" ? (
              <AccountsView accounts={accounts} />
            ) : activeTab === "positions" ? (
              <PositionsView />
            ) : activeTab === "orders" ? (
              <OrdersView />
            ) : (
              <PerformanceView />
            )}
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}

function BrokerConnectionForm({
  selectedBroker,
  setSelectedBroker,
  formData,
  setFormData,
  onConnect,
  onCancel,
}: any) {
  const brokerInfo = {
    ALPACA: {
      name: "Alpaca",
      description: "수수료 무료 주식 및 암호화폐 거래",
      docs: "https://alpaca.markets/docs",
    },
    INTERACTIVE_BROKERS: {
      name: "Interactive Brokers",
      description: "전 세계 시장 접근, 낮은 수수료",
      docs: "https://www.interactivebrokers.com",
    },
    TD_AMERITRADE: {
      name: "TD Ameritrade",
      description: "충분한 기능의 풀 서비스 브로커",
      docs: "https://www.tdameritrade.com",
    },
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold mb-6">새로운 브로커 연결</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(brokerInfo).map(([key, info]: any) => (
          <div
            key={key}
            onClick={() => setSelectedBroker(key)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedBroker === key
                ? "border-blue-600 bg-blue-600/10"
                : "border-border hover:border-blue-400"
            }`}
          >
            <h3 className="font-bold mb-2">{info.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{info.description}</p>
            <a
              href={info.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              문서 보기 →
            </a>
          </div>
        ))}
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-2">API Key</label>
          <input
            type="password"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            placeholder="API 키 입력"
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">API Secret</label>
          <input
            type="password"
            value={formData.apiSecret}
            onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
            placeholder="API 시크릿 입력"
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">계정 ID (선택사항)</label>
          <input
            type="text"
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            placeholder="계정 ID"
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          />
        </div>
      </div>

      <div className="bg-yellow-600/10 border border-yellow-600 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-700">
          ⚠️ API 키는 암호화되어 안전하게 저장됩니다. 절대 공유하지 마세요.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onConnect}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all"
        >
          연결
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-3 rounded-lg transition-all"
        >
          취소
        </button>
      </div>
    </div>
  )
}

function ConnectionsView({ connections }: { connections: BrokerConnection[] }) {
  if (connections.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <AlertCircle className="mx-auto mb-4 text-muted-foreground" size={32} />
        <p className="text-muted-foreground mb-4">연결된 브로커가 없습니다</p>
        <p className="text-sm text-muted-foreground">위의 "브로커 연결" 버튼을 클릭하여 시작하세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {connections.map((conn) => (
        <div key={conn.id} className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${
                conn.status === "CONNECTED"
                  ? "bg-green-600/10"
                  : "bg-red-600/10"
              }`}>
                <Check className={`${
                  conn.status === "CONNECTED"
                    ? "text-green-600"
                    : "text-red-600"
                }`} size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">{conn.broker}</h3>
                <p className="text-sm text-muted-foreground">계정: {conn.account_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                conn.status === "CONNECTED"
                  ? "bg-green-600/20 text-green-600"
                  : "bg-red-600/20 text-red-600"
              }`}>
                {conn.status === "CONNECTED" ? "연결됨" : "연결 끊김"}
              </span>
              <button className="p-2 hover:bg-muted rounded-lg transition-all">
                <Settings size={18} />
              </button>
              <button className="p-2 hover:bg-red-600/10 rounded-lg transition-all text-red-600">
                <Unlink size={18} />
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            연결일: {new Date(conn.connected_at).toLocaleString("ko-KR")}
          </p>
        </div>
      ))}
    </div>
  )
}

function AccountsView({ accounts }: { accounts: BrokerAccount[] }) {
  if (accounts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">계정 정보를 불러올 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {accounts.map((account, idx) => (
        <div key={idx} className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">{account.broker}</h3>
              <p className="text-sm text-muted-foreground">계정: {account.account_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">총 자본</p>
              <p className="text-lg font-bold text-blue-600">
                ${account.total_equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">매수력</p>
              <p className="text-lg font-bold text-green-600">
                ${account.buying_power.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">현금</p>
              <p className="text-lg font-bold">
                ${account.cash_balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">포지션</p>
              <p className="text-lg font-bold">{account.positions_count}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PositionsView() {
  const positions = [
    {
      symbol: "SPY",
      quantity: 100,
      average_cost: 450.25,
      current_price: 452.50,
      market_value: 45250.00,
      unrealized_gain: 225.00,
      unrealized_gain_percent: 0.50,
      account_percentage: 30.2,
    },
    {
      symbol: "QQQ",
      quantity: 50,
      average_cost: 380.00,
      current_price: 385.50,
      market_value: 19275.00,
      unrealized_gain: 275.00,
      unrealized_gain_percent: 1.45,
      account_percentage: 12.9,
    },
    {
      symbol: "AAPL",
      quantity: 75,
      average_cost: 170.50,
      current_price: 175.25,
      market_value: 13143.75,
      unrealized_gain: 356.25,
      unrealized_gain_percent: 2.79,
      account_percentage: 8.8,
    },
  ]

  return (
    <div className="space-y-4">
      {positions.map((pos, idx) => (
        <div key={idx} className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">{pos.symbol}</h3>
              <p className="text-sm text-muted-foreground">{pos.quantity}주</p>
            </div>
            <div className={`text-right ${pos.unrealized_gain >= 0 ? "text-green-600" : "text-red-600"}`}>
              <p className="text-lg font-bold">${pos.market_value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="text-sm">{pos.unrealized_gain >= 0 ? "+" : ""}{pos.unrealized_gain_percent.toFixed(2)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">평균 진입가</p>
              <p className="text-lg font-bold">
                ${pos.average_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">현재가</p>
              <p className="text-lg font-bold">
                ${pos.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">미실현 손익</p>
              <p className={`text-lg font-bold ${pos.unrealized_gain >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${pos.unrealized_gain.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">포트폴리오 비중</p>
              <p className="text-lg font-bold">{pos.account_percentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OrdersView() {
  const orders = [
    {
      broker_order_id: "SPY_1234567890",
      symbol: "SPY",
      quantity: 50,
      order_type: "LIMIT",
      order_side: "BUY",
      price: 450.00,
      status: "FILLED",
      created_at: "2026-04-05T10:30:00",
      filled_quantity: 50,
      average_filled_price: 450.15,
    },
    {
      broker_order_id: "QQQ_1234567891",
      symbol: "QQQ",
      quantity: 25,
      order_type: "MARKET",
      order_side: "BUY",
      price: null,
      status: "FILLED",
      created_at: "2026-04-05T11:15:00",
      filled_quantity: 25,
      average_filled_price: 385.50,
    },
    {
      broker_order_id: "AAPL_1234567892",
      symbol: "AAPL",
      quantity: 100,
      order_type: "LIMIT",
      order_side: "BUY",
      price: 170.00,
      status: "PENDING",
      created_at: "2026-04-05T14:00:00",
      filled_quantity: 0,
      average_filled_price: 0,
    },
  ]

  return (
    <div className="space-y-4">
      {orders.map((order, idx) => (
        <div key={idx} className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">{order.symbol}</h3>
              <p className="text-sm text-muted-foreground">{order.order_type} {order.order_side}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              order.status === "FILLED"
                ? "bg-green-600/20 text-green-600"
                : order.status === "PENDING"
                ? "bg-yellow-600/20 text-yellow-600"
                : "bg-gray-600/20 text-gray-600"
            }`}>
              {order.status === "FILLED" ? "체결됨" : "대기중"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">수량</p>
              <p className="text-lg font-bold">{order.quantity}주</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">지정가</p>
              <p className="text-lg font-bold">
                {order.price ? `$${order.price.toFixed(2)}` : "시장가"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">체결 수량</p>
              <p className="text-lg font-bold">{order.filled_quantity}주</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">평균 체결가</p>
              <p className="text-lg font-bold">
                {order.average_filled_price > 0 ? `$${order.average_filled_price.toFixed(2)}` : "N/A"}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            주문 ID: {order.broker_order_id} · 주문일: {new Date(order.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
      ))}
    </div>
  )
}

function PerformanceView() {
  const performanceData = {
    total_portfolio_value: 150000.00,
    positions_value: 77668.75,
    cash_balance: 72331.25,
    total_unrealized_gain: 856.25,
    total_unrealized_gain_percent: 1.11,
    buying_power: 50000.00,
    available_funds: 45000.00,
    positions_count: 3,
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-2">포트폴리오 가치</p>
          <p className="text-3xl font-bold">
            ${performanceData.total_portfolio_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-2">미실현 손익</p>
          <p className="text-3xl font-bold text-green-600">
            ${performanceData.total_unrealized_gain.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-green-600">+{performanceData.total_unrealized_gain_percent.toFixed(2)}%</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-2">포지션 수</p>
          <p className="text-3xl font-bold">{performanceData.positions_count}</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">자산 구성</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">포지션 가치</span>
              <span className="font-bold">
                ${performanceData.positions_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">현금</span>
              <span className="font-bold">
                ${performanceData.cash_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="border-t border-border pt-3 mt-3 flex justify-between items-center">
              <span className="text-muted-foreground">계정 순자산</span>
              <span className="font-bold">
                ${performanceData.total_portfolio_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">거래력</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">매수력</span>
              <span className="font-bold text-green-600">
                ${performanceData.buying_power.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">가용 자금</span>
              <span className="font-bold">
                ${performanceData.available_funds.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
