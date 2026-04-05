"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Bell, Plus, Trash2, Toggle2, Filter, Clock, DollarSign, TrendingUp, AlertCircle, Volume2, Eye, BookOpen } from "lucide-react"

interface Alert {
  id: number
  symbol: string
  type: string
  trigger_value?: number
  trigger_price?: number
  indicator?: string
  condition?: string
  threshold?: number
  alert_type?: string
  message?: string
  active: boolean
  created_at?: string
}

interface AlertHistory {
  id: number
  alert_type: string
  symbol: string
  trigger_price?: number
  notify_method: string
  triggered_at: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const ALERT_TYPES = [
  { value: "PRICE", label: "가격 알람", icon: "💰", desc: "가격이 특정 수준 도달" },
  { value: "INDICATOR", label: "지표 알람", icon: "📊", desc: "RSI, MACD, MA 등" },
  { value: "VOLUME", label: "거래량 알람", icon: "📈", desc: "비정상 거래량" },
  { value: "PORTFOLIO", label: "포트폴리오 알람", icon: "🎯", desc: "포트폴리오 손익" },
  { value: "NEWS", label: "뉴스 알람", icon: "📰", desc: "기업 뉴스/이벤트" },
  { value: "TIME", label: "시간 알람", icon: "⏰", desc: "특정 시간 알림" },
  { value: "COMPOSITE", label: "복합 조건", icon: "⚙️", desc: "AND/OR 조건" }
]

const NOTIFY_CHANNELS = [
  { value: "EMAIL", label: "이메일", checked: true },
  { value: "PUSH", label: "푸시 알림", checked: true },
  { value: "SMS", label: "SMS", checked: false },
  { value: "TELEGRAM", label: "텔레그램", checked: false },
  { value: "DISCORD", label: "디스코드", checked: false }
]

export default function AlertsPage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"manage" | "history" | "settings">("manage")
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([])
  const [showNewAlert, setShowNewAlert] = useState(false)
  const [selectedAlertType, setSelectedAlertType] = useState<string | null>(null)
  const [filterSymbol, setFilterSymbol] = useState("")

  const [newAlert, setNewAlert] = useState({
    symbol: "",
    alert_type: "PRICE",
    trigger_price: 0,
    condition: "ABOVE",
    threshold: 0,
    message: "",
    notify_methods: ["PUSH", "EMAIL"]
  })

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/alerts?user_id=${user.user_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const allAlerts = [
            ...(data.price_alerts || []),
            ...(data.indicator_alerts || []),
            ...(data.volume_alerts || []),
            ...(data.portfolio_alerts || []),
            ...(data.news_alerts || []),
            ...(data.time_alerts || [])
          ]
          setAlerts(allAlerts)
        }

        const historyRes = await fetch(`${API_BASE}/api/alerts/history?user_id=${user.user_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (historyRes.ok) {
          const data = await historyRes.json()
          setAlertHistory(data.history || [])
        }
      } catch (err) {
        console.error("Failed to load alerts", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [user?.user_id, token])

  const handleCreateAlert = async () => {
    if (!newAlert.symbol || newAlert.trigger_price === 0) {
      alert("필수 항목을 입력하세요")
      return
    }

    try {
      let endpoint = `${API_BASE}/api/alerts/`

      if (newAlert.alert_type === "PRICE") {
        endpoint += "price"
      } else if (newAlert.alert_type === "INDICATOR") {
        endpoint += "indicator"
      } else if (newAlert.alert_type === "VOLUME") {
        endpoint += "volume"
      } else if (newAlert.alert_type === "PORTFOLIO") {
        endpoint += "portfolio"
      } else if (newAlert.alert_type === "NEWS") {
        endpoint += "news"
      } else if (newAlert.alert_type === "TIME") {
        endpoint += "time"
      } else if (newAlert.alert_type === "COMPOSITE") {
        endpoint += "composite"
      }

      const res = await fetch(endpoint + `?user_id=${user?.user_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newAlert)
      })

      if (res.ok) {
        alert("알람이 생성되었습니다")
        setNewAlert({
          symbol: "",
          alert_type: "PRICE",
          trigger_price: 0,
          condition: "ABOVE",
          threshold: 0,
          message: "",
          notify_methods: ["PUSH", "EMAIL"]
        })
        setShowNewAlert(false)
        // Refetch alerts
        const refreshRes = await fetch(`${API_BASE}/api/alerts?user_id=${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          const allAlerts = [
            ...(data.price_alerts || []),
            ...(data.indicator_alerts || []),
            ...(data.volume_alerts || []),
            ...(data.portfolio_alerts || []),
            ...(data.news_alerts || []),
            ...(data.time_alerts || [])
          ]
          setAlerts(allAlerts)
        }
      }
    } catch (err) {
      console.error("Failed to create alert", err)
      alert("알람 생성 실패")
    }
  }

  const handleDeleteAlert = async (alertId: number, alertType: string) => {
    if (!confirm("이 알람을 삭제하시겠습니까?")) return

    try {
      const res = await fetch(`${API_BASE}/api/alerts/${alertId}?alert_type=${alertType}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        setAlerts(alerts.filter(a => a.id !== alertId))
      }
    } catch (err) {
      console.error("Failed to delete alert", err)
    }
  }

  const handleToggleAlert = async (alertId: number, alertType: string, currentState: boolean) => {
    try {
      await fetch(`${API_BASE}/api/alerts/${alertId}/toggle?alert_type=${alertType}&is_active=${!currentState}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      })

      setAlerts(alerts.map(a =>
        a.id === alertId ? { ...a, active: !a.active } : a
      ))
    } catch (err) {
      console.error("Failed to toggle alert", err)
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "PRICE":
        return <DollarSign className="w-4 h-4" />
      case "INDICATOR":
        return <TrendingUp className="w-4 h-4" />
      case "VOLUME":
        return <Volume2 className="w-4 h-4" />
      case "PORTFOLIO":
        return <Eye className="w-4 h-4" />
      case "NEWS":
        return <BookOpen className="w-4 h-4" />
      case "TIME":
        return <Clock className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const filteredAlerts = filterSymbol
    ? alerts.filter(a => a.symbol?.includes(filterSymbol.toUpperCase()))
    : alerts

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
                <Bell className="w-8 h-8 text-yellow-500" />
                알람 설정
              </h1>
              <p className="text-muted-foreground">
                가격, 지표, 거래량, 뉴스 등 다양한 알람 설정
              </p>
            </div>
            <Button onClick={() => setShowNewAlert(true)}>
              <Plus className="w-4 h-4 mr-2" />
              알람 추가
            </Button>
          </div>
        </AnimateIn>

        {/* Tab Navigation */}
        <AnimateIn from="bottom" delay={40}>
          <div className="flex gap-2 mb-6 border-b border-border">
            <button
              onClick={() => setActiveTab("manage")}
              className={`px-4 py-2 font-medium border-b-2 transition-all ${
                activeTab === "manage"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bell className="w-4 h-4 inline mr-2" />
              알람 관리 ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 font-medium border-b-2 transition-all ${
                activeTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="w-4 h-4 inline mr-2" />
              발생 이력
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 font-medium border-b-2 transition-all ${
                activeTab === "settings"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              ⚙️ 설정
            </button>
          </div>
        </AnimateIn>

        {/* Alert Management Tab */}
        {activeTab === "manage" && (
          <AnimateIn from="bottom" delay={80}>
            <div>
              {/* Filter */}
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder="심볼로 필터 (예: QQQ)"
                  value={filterSymbol}
                  onChange={(e) => setFilterSymbol(e.target.value)}
                  className="px-3 py-2 bg-muted border border-border rounded-lg text-sm w-48"
                />
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  필터
                </Button>
              </div>

              {/* Active Alerts */}
              <div className="space-y-3">
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map(alert => (
                    <div
                      key={alert.id}
                      className="bg-card border border-border rounded-lg p-4 flex items-start justify-between hover:border-primary transition-all"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-muted rounded-lg">
                          {getAlertIcon(alert.type || alert.alert_type)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{alert.symbol}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.type === "PRICE" && `가격이 $${alert.trigger_price}${alert.type === "PRICE_ABOVE" ? " 이상" : " 이하"}`}
                            {alert.type === "INDICATOR" && `${alert.indicator} ${alert.condition} ${alert.threshold}`}
                            {alert.type === "VOLUME" && `거래량 알람`}
                            {alert.type === "PORTFOLIO" && `포트폴리오 ${alert.alert_type}`}
                            {alert.type === "NEWS" && `뉴스 알람`}
                            {alert.type === "TIME" && alert.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            생성: {alert.created_at ? new Date(alert.created_at).toLocaleDateString("ko-KR") : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAlert(alert.id, alert.type || alert.alert_type, alert.active)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            alert.active
                              ? "bg-green-500/20 text-green-600"
                              : "bg-gray-500/20 text-gray-600"
                          }`}
                        >
                          {alert.active ? "활성" : "비활성"}
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(alert.id, alert.type || alert.alert_type)}
                          className="p-2 hover:bg-red-500/10 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">알람이 없습니다</p>
                    <Button onClick={() => setShowNewAlert(true)} className="mt-4">
                      알람 추가하기
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </AnimateIn>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <AnimateIn from="bottom" delay={80}>
            <div className="space-y-2">
              {alertHistory.length > 0 ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-5 gap-4 p-4 bg-muted/50 font-semibold text-sm">
                    <div>알람 타입</div>
                    <div>심볼</div>
                    <div>트리거 가격</div>
                    <div>알림 채널</div>
                    <div>발생 시간</div>
                  </div>
                  {alertHistory.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-4 p-4 border-t border-border text-sm">
                      <div>{item.alert_type}</div>
                      <div className="font-semibold">{item.symbol}</div>
                      <div>${item.trigger_price?.toFixed(2)}</div>
                      <div className="text-muted-foreground">{item.notify_method}</div>
                      <div>{new Date(item.triggered_at).toLocaleString("ko-KR")}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">발생한 알람이 없습니다</p>
                </div>
              )}
            </div>
          </AnimateIn>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <AnimateIn from="bottom" delay={80}>
            <div className="max-w-2xl">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-bold text-lg mb-4">알림 채널 설정</h3>

                <div className="space-y-3 mb-6">
                  {NOTIFY_CHANNELS.map(channel => (
                    <div key={channel.value} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded">
                      <input
                        type="checkbox"
                        defaultChecked={channel.checked}
                        className="w-4 h-4"
                      />
                      <label className="flex-1 font-medium text-sm">{channel.label}</label>
                      {channel.value === "EMAIL" && <span className="text-xs text-muted-foreground">로그인 이메일로 발송</span>}
                      {channel.value === "PUSH" && <span className="text-xs text-muted-foreground">브라우저 알림</span>}
                      {channel.value === "SMS" && <span className="text-xs text-muted-foreground">휴대폰 문자메시지</span>}
                      {channel.value === "TELEGRAM" && <span className="text-xs text-muted-foreground">텔레그램봇</span>}
                      {channel.value === "DISCORD" && <span className="text-xs text-muted-foreground">디스코드 웹훅</span>}
                    </div>
                  ))}
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-bold mb-3">조용한 시간</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">알람을 받지 않을 시간대:</span>
                    <input
                      type="time"
                      defaultValue="23:00"
                      className="px-3 py-2 bg-muted border border-border rounded"
                    />
                    <span className="text-sm">부터</span>
                    <input
                      type="time"
                      defaultValue="09:00"
                      className="px-3 py-2 bg-muted border border-border rounded"
                    />
                  </div>
                </div>

                <Button className="mt-6">저장</Button>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Create Alert Dialog */}
        {showNewAlert && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border p-6">
                <h2 className="text-xl font-bold">새 알람 추가</h2>
              </div>

              <div className="p-6">
                {!selectedAlertType ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">알람 타입을 선택하세요</p>
                    {ALERT_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setSelectedAlertType(type.value)}
                        className="w-full text-left p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{type.icon}</span>
                          <div>
                            <p className="font-bold">{type.label}</p>
                            <p className="text-xs text-muted-foreground">{type.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      onClick={() => setSelectedAlertType(null)}
                      className="text-sm text-primary hover:underline"
                    >
                      ← 뒤로 가기
                    </button>

                    <div>
                      <label className="block text-sm font-medium mb-2">심볼</label>
                      <input
                        type="text"
                        value={newAlert.symbol}
                        onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase() })}
                        placeholder="QQQ"
                        className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                      />
                    </div>

                    {selectedAlertType === "PRICE" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-2">조건</label>
                          <select
                            value={newAlert.condition}
                            onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value })}
                            className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                          >
                            <option value="ABOVE">이상</option>
                            <option value="BELOW">이하</option>
                            <option value="BETWEEN">범위</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">가격</label>
                          <input
                            type="number"
                            value={newAlert.trigger_price}
                            onChange={(e) => setNewAlert({ ...newAlert, trigger_price: Number(e.target.value) })}
                            placeholder="150.00"
                            className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">알림 채널</label>
                      <div className="flex flex-wrap gap-2">
                        {["PUSH", "EMAIL"].map(channel => (
                          <button
                            key={channel}
                            onClick={() => {
                              if (newAlert.notify_methods.includes(channel)) {
                                setNewAlert({
                                  ...newAlert,
                                  notify_methods: newAlert.notify_methods.filter(m => m !== channel)
                                })
                              } else {
                                setNewAlert({
                                  ...newAlert,
                                  notify_methods: [...newAlert.notify_methods, channel]
                                })
                              }
                            }}
                            className={`px-3 py-2 text-sm rounded border transition-all ${
                              newAlert.notify_methods.includes(channel)
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border hover:border-primary"
                            }`}
                          >
                            {channel === "PUSH" ? "푸시" : "이메일"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedAlertType && (
                <div className="sticky bottom-0 bg-card border-t border-border p-6 flex gap-3">
                  <Button onClick={handleCreateAlert} className="flex-1">
                    추가
                  </Button>
                  <Button onClick={() => setShowNewAlert(false)} variant="outline" className="flex-1">
                    취소
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
