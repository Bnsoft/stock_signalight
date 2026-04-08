"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import {
  Plus,
  Trash2,
  ToggleLeft,
  Clock,
  TrendingUp,
  TrendingDown,
  Volume2,
  BarChart3,
  AlertCircle,
  Newspaper,
  Bell,
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useCache } from "@/hooks/useCache"
import { usePagination } from "@/hooks/usePagination"
import { ToastContainer } from "@/components/ToastContainer"
import { Pagination } from "@/components/Pagination"

interface Alert {
  id: string
  type: string
  symbol: string
  name: string
  condition: string
  threshold: number
  enabled: boolean
  createdDate: string
  lastTriggered?: string
  notificationChannels: string[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const alertTypeIcons: Record<string, React.ReactNode> = {
  price: <TrendingUp size={18} />,
  indicator: <BarChart3 size={18} />,
  volume: <Volume2 size={18} />,
  portfolio: <TrendingDown size={18} />,
  news: <Newspaper size={18} />,
  time: <Clock size={18} />,
  composite: <AlertCircle size={18} />,
}

const alertTypeLabels: Record<string, string> = {
  price: "가격 알람",
  indicator: "지표 알람",
  volume: "거래량 알람",
  portfolio: "포트폴리오 알람",
  news: "뉴스 알람",
  time: "시간 기반 알람",
  composite: "복합 조건 알람",
}

export default function AlertsPage() {
  const { user, token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()
  const cache = useCache({ defaultTTL: 2 * 60 * 1000 })
  const pagination = usePagination(10)

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedType, setSelectedType] = useState("price")
  const [formData, setFormData] = useState({
    symbol: "",
    name: "",
    condition: "greater",
    threshold: "",
    notificationChannels: [] as string[],
  })

  useEffect(() => {
    loadAlerts()
  }, [])

  useEffect(() => {
    pagination.setTotal(alerts.length)
  }, [alerts])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const cached = cache.get(`/api/alerts`) as Alert[] | null
      if (cached) {
        setAlerts(cached)
        return
      }

      const response = await fetch(`${API_BASE}/api/alerts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to load alerts")

      const data = await response.json()
      const alertsList: Alert[] = data.data || []

      cache.set(`/api/alerts`, alertsList)
      setAlerts(alertsList)
    } catch (err) {
      showError("알람을 로드할 수 없습니다")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAlert = async () => {
    if (!formData.symbol.trim() || !formData.threshold) {
      showError("필수 정보를 입력하세요")
      return
    }

    try {
      const payload = {
        symbol: formData.symbol.toUpperCase(),
        name: formData.name || formData.symbol,
        condition: formData.condition,
        threshold: parseFloat(formData.threshold),
        notification_channels: formData.notificationChannels,
      }

      const endpoint = {
        price: "/api/alerts/price",
        indicator: "/api/alerts/indicator",
        volume: "/api/alerts/volume",
        portfolio: "/api/alerts/portfolio",
        news: "/api/alerts/news",
        time: "/api/alerts/time",
        composite: "/api/alerts/composite",
      }[selectedType]

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to create alert")

      cache.remove(`/api/alerts`)
      success("알람이 추가되었습니다")
      setFormData({
        symbol: "",
        name: "",
        condition: "greater",
        threshold: "",
        notificationChannels: [],
      })
      setShowAddForm(false)

      await loadAlerts()
    } catch (err) {
      showError("알람 추가에 실패했습니다")
      console.error(err)
    }
  }

  const handleToggleAlert = async (alertId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/alerts/${alertId}/toggle`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to toggle alert")

      cache.remove(`/api/alerts`)
      success("알람이 업데이트되었습니다")
      await loadAlerts()
    } catch (err) {
      showError("알람 업데이트에 실패했습니다")
      console.error(err)
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm("이 알람을 삭제하시겠습니까?")) return

    try {
      const response = await fetch(`${API_BASE}/api/alerts/${alertId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to delete alert")

      cache.remove(`/api/alerts`)
      success("알람이 삭제되었습니다")
      await loadAlerts()
    } catch (err) {
      showError("알람 삭제에 실패했습니다")
      console.error(err)
    }
  }

  const displayAlerts = alerts.slice(pagination.startIndex, pagination.endIndex)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">알람 관리</h1>
              <p className="text-muted-foreground">가격, 지표, 거래량 등 다양한 알람을 설정하세요</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all"
            >
              <Plus size={18} />
              새 알람
            </button>
          </div>
        </AnimateIn>

        {showAddForm && (
          <AnimateIn from="bottom" delay={80}>
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">새 알람 추가</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">알람 타입</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                  >
                    {Object.entries(alertTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">종목 심볼</label>
                  <input
                    type="text"
                    placeholder="예: AAPL, MSFT"
                    value={formData.symbol}
                    onChange={(e) =>
                      setFormData({ ...formData, symbol: e.target.value.toUpperCase() })
                    }
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">조건</label>
                  <select
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({ ...formData, condition: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                  >
                    <option value="greater">초과</option>
                    <option value="less">미만</option>
                    <option value="equal">같음</option>
                    <option value="crossing">교차</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">임계값</label>
                  <input
                    type="number"
                    placeholder="예: 150.5"
                    value={formData.threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, threshold: e.target.value })
                    }
                    step="0.01"
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">알림 채널</label>
                <div className="flex gap-4">
                  {["email", "push", "sms", "telegram", "discord"].map((channel) => (
                    <label key={channel} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.notificationChannels.includes(channel)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              notificationChannels: [
                                ...formData.notificationChannels,
                                channel,
                              ],
                            })
                          } else {
                            setFormData({
                              ...formData,
                              notificationChannels: formData.notificationChannels.filter(
                                (c) => c !== channel
                              ),
                            })
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddAlert}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
                >
                  추가
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg transition-all"
                >
                  취소
                </button>
              </div>
            </div>
          </AnimateIn>
        )}

        <AnimateIn from="bottom" delay={160}>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                로딩 중...
              </div>
            ) : alerts.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <Bell className="mx-auto mb-4 text-muted-foreground" size={32} />
                <p className="text-muted-foreground mb-4">설정된 알람이 없습니다</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  첫 번째 알람 추가
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {displayAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-card border border-border rounded-lg p-6 hover:border-blue-600 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-2 bg-muted rounded-lg text-blue-600">
                            {alertTypeIcons[alert.type]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold">{alert.symbol}</h3>
                              <span className="px-2 py-1 bg-muted rounded text-xs font-semibold">
                                {alertTypeLabels[alert.type]}
                              </span>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  alert.enabled
                                    ? "bg-green-600/10 text-green-600"
                                    : "bg-gray-600/10 text-gray-600"
                                }`}
                              >
                                {alert.enabled ? "활성화" : "비활성화"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{alert.name}</p>
                            <p className="text-sm mt-2">
                              조건: <span className="font-semibold">{alert.condition}</span> {alert.threshold}
                            </p>
                            {alert.notificationChannels.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                알림: {alert.notificationChannels.join(", ")}
                              </p>
                            )}
                            {alert.lastTriggered && (
                              <p className="text-xs text-muted-foreground mt-1">
                                마지막 발동: {alert.lastTriggered}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleAlert(alert.id)}
                            className={`p-2 rounded-lg transition-all ${
                              alert.enabled
                                ? "hover:bg-yellow-600/10 text-yellow-600"
                                : "hover:bg-green-600/10 text-green-600"
                            }`}
                            title={alert.enabled ? "비활성화" : "활성화"}
                          >
                            <ToggleLeft size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="p-2 hover:bg-red-600/10 rounded-lg transition-all text-red-600"
                            title="삭제"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {alerts.length > pagination.pageSize && (
                  <Pagination
                    state={pagination}
                    pageRange={pagination.pageRange}
                    hasNextPage={pagination.hasNextPage}
                    hasPrevPage={pagination.hasPrevPage}
                    onPreviousPage={pagination.prevPage}
                    onNextPage={pagination.nextPage}
                    onGoToPage={pagination.goToPage}
                    onChangePageSize={pagination.changePageSize}
                  />
                )}
              </>
            )}
          </div>
        </AnimateIn>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
