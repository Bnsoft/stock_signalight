"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import {
  Plus,
  Trash2,
  ToggleLeft,
  TrendingUp,
  Volume2,
  BarChart3,
  Bell,
  Pencil,
  Play,
  Clock,
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { useCache } from "@/hooks/useCache"
import { usePagination } from "@/hooks/usePagination"
import { ToastContainer } from "@/components/ToastContainer"
import { Pagination } from "@/components/Pagination"
import { MAChart } from "@/components/dashboard/MAChart"

interface ScheduleLog {
  id: number
  alert_id: number
  alert_category: string
  symbol: string
  schedule_type: string
  fired_at: string
  status: "success" | "failed" | "skipped"
  triggered: boolean
  message_sent?: string
  error_reason?: string
}

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
  scheduleEnabled?: boolean
  scheduleType?: string
  scheduleTime?: string
  scheduleDays?: string
  scheduleStart?: string
  scheduleEnd?: string
  scheduleInterval?: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const alertTypeIcons: Record<string, React.ReactNode> = {
  price: <TrendingUp size={18} />,
  ma: <BarChart3 size={18} />,
  volume: <Volume2 size={18} />,
}

const alertTypeLabels: Record<string, string> = {
  price: "가격 알람",
  ma: "이동평균선",
  volume: "거래량 알람",
}

export default function AlertsPage() {
  const { user, token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()
  const cache = useCache({ defaultTTL: 2 * 60 * 1000 })
  const pagination = usePagination(10)

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"alerts" | "logs">("alerts")
  const [logs, setLogs] = useState<ScheduleLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [expandedLog, setExpandedLog] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<Record<string, unknown> | null>(null)
  const [maPreview, setMaPreview] = useState<Record<string, number | null> | null>(null)
  const [maPreviewLoading, setMaPreviewLoading] = useState(false)
  const maPreviewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedType, setSelectedType] = useState("price")
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; type: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const defaultForm = {
    symbol: "",
    condition: "greater",
    threshold: "",
    maPeriod: "20",
    maCondition: "CROSS_ABOVE",
    maTimeframe: "1D",
    volumeMultiplier: "2",
    notificationChannels: [] as string[],
    scheduleEnabled: false,
    scheduleType: "once",
    scheduleTime: "07:00",
    scheduleDays: "daily",
    scheduleStart: "09:30",
    scheduleEnd: "16:00",
    scheduleInterval: "5",
  }
  const [formData, setFormData] = useState(defaultForm)

  useEffect(() => {
    loadAlerts()
  }, [])

  useEffect(() => {
    pagination.setTotal(alerts.length)
  }, [alerts])

  useEffect(() => {
    if (activeTab === "logs") loadLogs()
  }, [activeTab])

  // Fetch MA preview when type=ma + symbol or timeframe changes
  useEffect(() => {
    if (selectedType === "ma" && formData.symbol.length >= 1) {
      fetchMaPreview(formData.symbol, formData.maTimeframe)
    } else {
      setMaPreview(null)
    }
  }, [selectedType, formData.symbol, formData.maTimeframe])

  const loadLogs = async () => {
    if (!user?.user_id) return
    setLogsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/alerts/schedule-logs?user_id=${user.user_id}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setLogs(data.logs || [])
    } catch { } finally { setLogsLoading(false) }
  }

  const handleSymbolInput = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, symbol: value.toUpperCase() }))
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (value.length < 1) { setSearchResults([]); setShowDropdown(false); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(value)}`)
        const data = await res.json()
        setSearchResults(data.results || [])
        setShowDropdown(true)
      } catch { setSearchResults([]) }
    }, 250)
  }, [])

  const selectSymbol = (symbol: string) => {
    setFormData((prev) => ({ ...prev, symbol }))
    setShowDropdown(false)
    setSearchResults([])
    if (selectedType === "ma") fetchMaPreview(symbol, formData.maTimeframe)
  }

  const fetchMaPreview = useCallback((symbol: string, timeframe: string) => {
    if (!symbol || symbol.length < 1) { setMaPreview(null); return }
    if (maPreviewTimeout.current) clearTimeout(maPreviewTimeout.current)
    maPreviewTimeout.current = setTimeout(async () => {
      setMaPreviewLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/quote/${symbol.toUpperCase()}`)
        if (!res.ok) { setMaPreview(null); return }
        const data = await res.json()
        const ind = data.indicators || {}
        if (timeframe === "1W") {
          // weekly: fetch from chart endpoint
          const chartRes = await fetch(`${API_BASE}/api/chart/${symbol.toUpperCase()}?interval=1wk&period=5y`)
          const chartData = await chartRes.json()
          const closes = (chartData.candles || []).map((c: { close: number }) => c.close)
          const wma = (period: number) => {
            if (closes.length < period) return null
            const slice = closes.slice(-period)
            return Math.round(slice.reduce((a: number, b: number) => a + b, 0) / period * 100) / 100
          }
          setMaPreview({ 5: wma(5), 20: wma(20), 50: wma(50), 120: wma(120), 200: wma(200), price: data.price })
        } else {
          setMaPreview({
            5: ind.ma_5 ?? null, 20: ind.ma_20 ?? null, 50: ind.ma_50 ?? null,
            120: ind.ma_120 ?? null, 200: ind.ma_200 ?? null, price: data.price
          })
        }
      } catch { setMaPreview(null) } finally { setMaPreviewLoading(false) }
    }, 500)
  }, [selectedType])

  const loadAlerts = async () => {
    if (!user?.user_id) return
    try {
      setLoading(true)
      const cached = cache.get(`/api/alerts`) as Alert[] | null
      if (cached) {
        setAlerts(cached)
        return
      }

      const response = await fetch(`${API_BASE}/api/alerts?user_id=${user?.user_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to load alerts")

      const data = await response.json()
      const alertsList: Alert[] = [
        ...(data.price_alerts || []).map((a: Record<string, unknown>) => ({
          id: `PRICE:${a.id}`, type: "price", symbol: a.symbol as string,
          name: `${a.symbol} 가격알람`, condition: a.type as string,
          threshold: a.trigger as number, enabled: a.active as boolean,
          createdDate: "", notificationChannels: (a.notify_methods as string[]) || [],
          scheduleEnabled: a.schedule_enabled as boolean, scheduleType: a.schedule_type as string,
          scheduleTime: a.schedule_time as string, scheduleDays: a.schedule_days as string,
          scheduleStart: a.schedule_start as string, scheduleEnd: a.schedule_end as string, scheduleInterval: a.schedule_interval as number,
        })),
        ...(data.indicator_alerts || []).map((a: Record<string, unknown>) => ({
          id: `INDICATOR:${a.id}`, type: "ma", symbol: a.symbol as string,
          name: `${a.symbol} MA${a.threshold}(${a.timeframe})`, condition: a.condition as string,
          threshold: a.threshold as number, enabled: a.active as boolean,
          createdDate: "", notificationChannels: (a.notify_methods as string[]) || [],
          scheduleEnabled: a.schedule_enabled as boolean, scheduleType: a.schedule_type as string,
          scheduleTime: a.schedule_time as string, scheduleDays: a.schedule_days as string,
          scheduleStart: a.schedule_start as string, scheduleEnd: a.schedule_end as string, scheduleInterval: a.schedule_interval as number,
        })),
        ...(data.volume_alerts || []).map((a: Record<string, unknown>) => ({
          id: `VOLUME:${a.id}`, type: "volume", symbol: a.symbol as string,
          name: `${a.symbol} 거래량알람`, condition: a.type as string,
          threshold: a.threshold as number, enabled: a.active as boolean,
          createdDate: "", notificationChannels: (a.notify_methods as string[]) || [],
          scheduleEnabled: a.schedule_enabled as boolean, scheduleType: a.schedule_type as string,
          scheduleTime: a.schedule_time as string, scheduleDays: a.schedule_days as string,
          scheduleStart: a.schedule_start as string, scheduleEnd: a.schedule_end as string, scheduleInterval: a.schedule_interval as number,
        })),
      ]

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
    if (!formData.symbol.trim()) {
      showError("종목 심볼을 입력하세요")
      return
    }

    try {
      const notifyMethods = formData.notificationChannels.length > 0
        ? formData.notificationChannels.map((c) => c.toUpperCase())
        : ["PUSH"]

      let payload: Record<string, unknown>
      let endpoint: string

      if (selectedType === "price") {
        const conditionMap: Record<string, string> = {
          greater: "PRICE_ABOVE",
          less: "PRICE_BELOW",
        }
        if (!formData.threshold) { showError("임계값을 입력하세요"); return }
        payload = {
          symbol: formData.symbol.toUpperCase(),
          alert_type: conditionMap[formData.condition] ?? "PRICE_ABOVE",
          trigger_price: parseFloat(formData.threshold),
          notify_methods: notifyMethods,
          repeat_alert: true,
        }
        endpoint = "/api/alerts/price"
      } else if (selectedType === "ma") {
        payload = {
          symbol: formData.symbol.toUpperCase(),
          indicator: "MA",
          condition: formData.maCondition,
          threshold: parseFloat(formData.maPeriod),
          timeframe: formData.maTimeframe,
          notify_methods: notifyMethods,
        }
        endpoint = "/api/alerts/indicator"
      } else {
        payload = {
          symbol: formData.symbol.toUpperCase(),
          alert_type: "UNUSUAL_VOLUME",
          volume_threshold: 0,
          multiplier: parseFloat(formData.volumeMultiplier),
          notify_methods: notifyMethods,
        }
        endpoint = "/api/alerts/volume"
      }

      // Attach schedule fields to payload
      const scheduleFields = {
        schedule_enabled: formData.scheduleEnabled,
        schedule_type: formData.scheduleType,
        schedule_time: formData.scheduleType === "once" ? formData.scheduleTime : null,
        schedule_days: formData.scheduleDays,
        schedule_start: formData.scheduleType === "interval" ? formData.scheduleStart : null,
        schedule_end: formData.scheduleType === "interval" ? formData.scheduleEnd : null,
        schedule_interval: formData.scheduleType === "interval" ? parseInt(formData.scheduleInterval) : null,
      }

      const response = await fetch(`${API_BASE}${endpoint}?user_id=${user?.user_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...payload, ...scheduleFields }),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.detail || "Failed to create alert")
      }

      cache.remove(`/api/alerts`)
      success("알람이 추가되었습니다")
      setFormData(defaultForm)
      setShowAddForm(false)

      await loadAlerts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알람 추가에 실패했습니다"
      showError(msg)
      console.error(err)
    }
  }

  const handleToggleAlert = async (alertId: string) => {
    const [alertType, rawId] = alertId.split(":")
    const alert = alerts.find((a) => a.id === alertId)
    try {
      const response = await fetch(
        `${API_BASE}/api/alerts/${rawId}/toggle?alert_type=${alertType}&is_active=${alert?.enabled ? 0 : 1}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }
      )

      if (!response.ok) throw new Error("Failed to toggle alert")

      cache.remove(`/api/alerts`)
      success("알람이 업데이트되었습니다")
      await loadAlerts()
    } catch (err) {
      showError("알람 업데이트에 실패했습니다")
      console.error(err)
    }
  }

  const handleRunAlert = async (alertId: string) => {
    const [alertType, rawId] = alertId.split(":")
    setRunningId(alertId)
    setRunResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/alerts/${rawId}/run?alert_category=${alertType}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setRunResult(data)
      if (data.status === "triggered") success(`알람 조건 충족! 텔레그램 발송 완료`)
      else if (data.status === "not_triggered") success("분석 완료 (조건 미충족) — 텔레그램 발송 완료")
      else showError("데이터 없음")
    } catch { showError("실행 실패") } finally { setRunningId(null) }
  }

  const startEdit = (alert: Alert) => {
    setEditingAlert(alert)
    setSelectedType(alert.type)
    setFormData({
      symbol: alert.symbol,
      condition: alert.condition.includes("ABOVE") ? "greater" : alert.condition.includes("BELOW") ? "less" : "greater",
      threshold: String(alert.threshold),
      maPeriod: String(alert.threshold),
      maCondition: alert.condition,
      maTimeframe: "1D",
      volumeMultiplier: String(alert.threshold) || "2",
      notificationChannels: alert.notificationChannels.map(c => c.toLowerCase()),
      scheduleEnabled: alert.scheduleEnabled || false,
      scheduleTime: alert.scheduleTime || "07:00",
      scheduleDays: alert.scheduleDays || "daily",
    })
    setShowAddForm(true)
  }

  const handleUpdateAlert = async () => {
    if (!editingAlert) return
    const [alertType, rawId] = editingAlert.id.split(":")
    const notifyMethods = formData.notificationChannels.length > 0
      ? formData.notificationChannels.map(c => c.toUpperCase())
      : ["PUSH"]
    const body: Record<string, unknown> = {
      notify_methods: notifyMethods,
      schedule_enabled: formData.scheduleEnabled,
      schedule_type: formData.scheduleType,
      schedule_time: formData.scheduleType === "once" ? formData.scheduleTime : null,
      schedule_days: formData.scheduleDays,
      schedule_start: formData.scheduleType === "interval" ? formData.scheduleStart : null,
      schedule_end: formData.scheduleType === "interval" ? formData.scheduleEnd : null,
      schedule_interval: formData.scheduleType === "interval" ? parseInt(formData.scheduleInterval) : null,
    }
    if (selectedType === "price") {
      body.trigger_price = parseFloat(formData.threshold)
      body.alert_type = formData.condition === "greater" ? "PRICE_ABOVE" : "PRICE_BELOW"
    } else if (selectedType === "ma") {
      body.threshold = parseFloat(formData.maPeriod)
      body.condition = formData.maCondition
      body.timeframe = formData.maTimeframe
    } else {
      body.multiplier = parseFloat(formData.volumeMultiplier)
    }
    try {
      const res = await fetch(`${API_BASE}/api/alerts/${rawId}?alert_category=${alertType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("수정 실패")
      cache.remove(`/api/alerts`)
      success("알람이 수정되었습니다")
      setEditingAlert(null)
      setShowAddForm(false)
      setFormData(defaultForm)
      await loadAlerts()
    } catch { showError("수정에 실패했습니다") }
  }

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm("이 알람을 삭제하시겠습니까?")) return

    const [alertType, rawId] = alertId.split(":")
    try {
      const response = await fetch(
        `${API_BASE}/api/alerts/${rawId}?alert_type=${alertType}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      )

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

  const selectCls = "w-full px-4 py-2.5 bg-white border border-[#f0eee6] rounded-xl text-sm text-[#141413] focus:outline-none focus:border-[#3898ec] transition-colors"
  const labelCls = "block text-xs font-medium text-[#87867f] mb-1.5 uppercase tracking-wide"

  return (
    <div className="min-h-screen bg-[#f5f4ed] p-8">
      <div className="max-w-3xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-medium text-[#141413] leading-tight mb-1" style={{ fontFamily: "Georgia, serif" }}>알람 관리</h1>
              <p className="text-[#87867f] text-sm">가격·이동평균선·거래량 알람을 설정하세요</p>
            </div>
            {activeTab === "alerts" && (
              <button
                onClick={() => { setEditingAlert(null); setFormData(defaultForm); setShowAddForm(!showAddForm) }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#c96442] hover:bg-[#b8573b] text-[#faf9f5] rounded-xl text-sm font-medium transition-colors shadow-[0px_0px_0px_1px_#c96442]"
              >
                <Plus size={16} /> 새 알람
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-[#e8e6dc] rounded-xl p-1 w-fit">
            {[{ key: "alerts", label: "알람 목록" }, { key: "logs", label: "실행 로그" }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as "alerts" | "logs")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? "bg-[#faf9f5] text-[#141413] shadow-[rgba(0,0,0,0.06)_0px_2px_8px]" : "text-[#5e5d59] hover:text-[#141413]"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </AnimateIn>

        {activeTab === "alerts" && showAddForm && (
          <AnimateIn from="bottom" delay={60}>
            <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-6 mb-5 shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
              <h2 className="text-base font-medium text-[#141413] mb-5" style={{ fontFamily: "Georgia, serif" }}>
                {editingAlert ? "알람 수정" : "새 알람 추가"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelCls}>알람 타입</label>
                  <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className={selectCls}>
                    {Object.entries(alertTypeLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>

                <div className="relative" ref={dropdownRef}>
                  <label className={labelCls}>종목 심볼</label>
                  <input
                    type="text" placeholder="예: AAPL, QQQ" value={formData.symbol}
                    onChange={(e) => handleSymbolInput(e.target.value)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    autoComplete="off"
                    className={selectCls}
                  />
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-[#faf9f5] border border-[#f0eee6] rounded-xl shadow-[rgba(0,0,0,0.1)_0px_8px_24px] overflow-hidden">
                      {searchResults.map((r) => (
                        <button key={r.symbol} type="button" onMouseDown={() => selectSymbol(r.symbol)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#f5f4ed] text-left transition-colors">
                          <div>
                            <span className="font-medium text-sm text-[#141413]">{r.symbol}</span>
                            <span className="text-xs text-[#87867f] ml-2">{r.name}</span>
                          </div>
                          <span className="text-xs text-[#b0aea5]">{r.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedType === "price" && (
                  <>
                    <div>
                      <label className={labelCls}>조건</label>
                      <select value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })} className={selectCls}>
                        <option value="greater">초과</option>
                        <option value="less">미만</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>가격</label>
                      <input type="number" placeholder="예: 150.5" value={formData.threshold}
                        onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                        step="0.01" className={selectCls} />
                    </div>
                  </>
                )}

                {selectedType === "ma" && (
                  <>
                    <div>
                      <label className={labelCls}>이동평균선</label>
                      <select value={formData.maPeriod} onChange={(e) => setFormData({ ...formData, maPeriod: e.target.value })} className={selectCls}>
                        <option value="5">5일선</option><option value="20">20일선</option>
                        <option value="50">50일선</option><option value="120">120일선</option><option value="200">200일선</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>조건</label>
                      <select value={formData.maCondition} onChange={(e) => setFormData({ ...formData, maCondition: e.target.value })} className={selectCls}>
                        <option value="CROSS_ABOVE">골든크로스 (상향돌파)</option>
                        <option value="CROSS_BELOW">데드크로스 (하향돌파)</option>
                        <option value="ABOVE">이평선 위</option><option value="BELOW">이평선 아래</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>주기</label>
                      <select value={formData.maTimeframe ?? "1D"} onChange={(e) => setFormData({ ...formData, maTimeframe: e.target.value })} className={selectCls}>
                        <option value="1D">일봉</option><option value="1W">주봉</option>
                      </select>
                    </div>
                  </>
                )}

                {/* MA 차트 */}
                {selectedType === "ma" && formData.symbol.length >= 1 && (
                  <div className="md:col-span-2 mt-1">
                    <MAChart
                      symbol={formData.symbol}
                      timeframe={formData.maTimeframe as "1D" | "1W"}
                      height={380}
                    />
                  </div>
                )}

                {/* MA 실시간 프리뷰 */}
                {selectedType === "ma" && formData.symbol && (
                  <div className="md:col-span-2 p-4 bg-[#f5f4ed] border border-[#f0eee6] rounded-xl">
                    <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-3">
                      {formData.symbol} {formData.maTimeframe === "1W" ? "주봉" : "일봉"} 이동평균선
                      {maPreviewLoading && <span className="ml-2 text-[#b0aea5]">로딩 중...</span>}
                    </p>
                    {maPreview ? (
                      <>
                        <div className="grid grid-cols-5 gap-2">
                          {([5, 20, 50, 120, 200] as const).map((p) => {
                            const val = maPreview[p] as number | null
                            const price = maPreview.price as number
                            const above = val !== null && price > val
                            const selected = formData.maPeriod === String(p)
                            return (
                              <button key={p} type="button"
                                onClick={() => setFormData(f => ({ ...f, maPeriod: String(p) }))}
                                className={`flex flex-col items-center p-2.5 rounded-xl border transition-all ${selected ? "border-[#c96442] bg-[#c96442]/5 shadow-[0px_0px_0px_1px_#c96442]" : "border-[#f0eee6] hover:border-[#e8e6dc]"}`}>
                                <span className="text-[10px] text-[#87867f] mb-1">MA{p}</span>
                                <span className="text-xs font-medium text-[#141413]">{val ? `$${val}` : "—"}</span>
                                {val !== null && <span className={`text-[10px] font-medium mt-0.5 ${above ? "text-[#2d6a4f]" : "text-[#b53333]"}`}>{above ? "↑" : "↓"}</span>}
                              </button>
                            )
                          })}
                        </div>
                        {maPreview.price && (
                          <p className="text-xs text-[#87867f] mt-2.5">현재가: <span className="font-medium text-[#141413]">${(maPreview.price as number).toFixed(2)}</span></p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-[#b0aea5]">심볼을 입력하면 이평선 값이 표시됩니다</p>
                    )}
                  </div>
                )}

                {selectedType === "volume" && (
                  <div>
                    <label className={labelCls}>거래량 배수 (평균 대비)</label>
                    <select value={formData.volumeMultiplier} onChange={(e) => setFormData({ ...formData, volumeMultiplier: e.target.value })} className={selectCls}>
                      <option value="1.5">1.5배</option><option value="2">2배</option>
                      <option value="3">3배</option><option value="5">5배</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <label className={labelCls}>알림 채널</label>
                <div className="flex gap-4">
                  {["email", "telegram"].map((ch) => (
                    <label key={ch} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.notificationChannels.includes(ch)}
                        onChange={(e) => setFormData({ ...formData, notificationChannels: e.target.checked ? [...formData.notificationChannels, ch] : formData.notificationChannels.filter(c => c !== ch) })}
                        className="w-4 h-4 accent-[#c96442] rounded" />
                      <span className="text-sm text-[#5e5d59] capitalize">{ch}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="mb-5 p-4 bg-[#f5f4ed] rounded-xl border border-[#f0eee6]">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={formData.scheduleEnabled}
                    onChange={(e) => setFormData({ ...formData, scheduleEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#c96442] rounded" />
                  <span className="text-sm font-medium text-[#141413] flex items-center gap-1.5">
                    <Clock size={14} className="text-[#87867f]" /> 예약 실행
                  </span>
                </label>

                {formData.scheduleEnabled && (
                  <div className="space-y-3">
                    {/* once / interval 선택 */}
                    <div className="flex gap-2">
                      {[{ v: "once", label: "특정 시간" }, { v: "interval", label: "반복 간격" }].map(opt => (
                        <button key={opt.v} type="button"
                          onClick={() => setFormData({ ...formData, scheduleType: opt.v })}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${formData.scheduleType === opt.v ? "bg-[#141413] text-[#faf9f5]" : "bg-[#e8e6dc] text-[#5e5d59]"}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {formData.scheduleType === "once" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>실행 시간</label>
                          <input type="time" value={formData.scheduleTime}
                            onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                            className={selectCls} />
                        </div>
                        <div>
                          <label className={labelCls}>반복 요일</label>
                          <select value={formData.scheduleDays}
                            onChange={(e) => setFormData({ ...formData, scheduleDays: e.target.value })}
                            className={selectCls}>
                            <option value="daily">매일</option>
                            <option value="weekdays">평일 (월-금)</option>
                            <option value="MON,WED,FRI">월·수·금</option>
                            <option value="MON">매주 월요일</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {formData.scheduleType === "interval" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>시작 시간</label>
                            <input type="time" value={formData.scheduleStart}
                              onChange={(e) => setFormData({ ...formData, scheduleStart: e.target.value })}
                              className={selectCls} />
                          </div>
                          <div>
                            <label className={labelCls}>종료 시간</label>
                            <input type="time" value={formData.scheduleEnd}
                              onChange={(e) => setFormData({ ...formData, scheduleEnd: e.target.value })}
                              className={selectCls} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>간격</label>
                            <select value={formData.scheduleInterval}
                              onChange={(e) => setFormData({ ...formData, scheduleInterval: e.target.value })}
                              className={selectCls}>
                              <option value="5">5분</option>
                              <option value="10">10분</option>
                              <option value="30">30분</option>
                              <option value="60">1시간</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>반복 요일</label>
                            <select value={formData.scheduleDays}
                              onChange={(e) => setFormData({ ...formData, scheduleDays: e.target.value })}
                              className={selectCls}>
                              <option value="daily">매일</option>
                              <option value="weekdays">평일 (월-금)</option>
                            </select>
                          </div>
                        </div>
                        <p className="text-xs text-[#87867f]">
                          예: {formData.scheduleStart} ~ {formData.scheduleEnd} 사이 {formData.scheduleInterval}분마다
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={editingAlert ? handleUpdateAlert : handleAddAlert}
                  className="px-5 py-2.5 bg-[#c96442] hover:bg-[#b8573b] text-[#faf9f5] rounded-xl text-sm font-medium transition-colors">
                  {editingAlert ? "수정 저장" : "추가"}
                </button>
                <button onClick={() => { setShowAddForm(false); setEditingAlert(null); setFormData(defaultForm) }}
                  className="px-5 py-2.5 bg-[#e8e6dc] hover:bg-[#d1cfc5] text-[#4d4c48] rounded-xl text-sm font-medium transition-colors">
                  취소
                </button>
              </div>
            </div>
          </AnimateIn>
        )}

        {activeTab === "logs" && (
          <AnimateIn from="bottom" delay={60}>
            <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl overflow-hidden shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0eee6]">
                <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide">스케줄 실행 로그</p>
                <button onClick={loadLogs} className="text-xs text-[#c96442] hover:underline">새로고침</button>
              </div>
              {logsLoading ? (
                <div className="py-10 text-center text-[#87867f] text-sm">로딩 중...</div>
              ) : logs.length === 0 ? (
                <div className="py-10 text-center text-[#87867f] text-sm">실행 기록이 없습니다</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#f0eee6]">
                        {["시간", "심볼", "구분", "상태", "조건충족", "메시지/오류"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#87867f] uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <>
                          <tr
                            key={log.id}
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            className={`border-b border-[#f0eee6]/50 transition-colors cursor-pointer ${
                              log.status === "failed" ? "hover:bg-[#b53333]/5" : "hover:bg-[#f5f4ed]"
                            }`}
                          >
                            <td className="px-4 py-3 text-xs text-[#87867f] whitespace-nowrap font-mono">
                              {new Date(log.fired_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#141413]">{log.symbol}</td>
                            <td className="px-4 py-3 text-xs text-[#87867f]">
                              {log.schedule_type === "manual" ? "▶ 수동" : log.schedule_type === "once" ? "⏰ 예약" : "🔁 반복"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                log.status === "success" ? "bg-[#2d6a4f]/10 text-[#2d6a4f]" :
                                "bg-[#b53333]/10 text-[#b53333]"
                              }`}>
                                {log.status === "success" ? "✓ 성공" : "✗ 실패"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {log.status === "success" ? (
                                <span className={`text-xs font-medium ${log.triggered ? "text-[#c96442]" : "text-[#87867f]"}`}>
                                  {log.triggered ? "🚨 충족" : "✅ 미충족"}
                                </span>
                              ) : <span className="text-[#b0aea5]">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#5e5d59]">
                              {log.status === "failed" ? (
                                <span className="text-[#b53333] font-medium flex items-center gap-1">
                                  ⚠ {log.error_reason ? log.error_reason.slice(0, 50) + (log.error_reason.length > 50 ? "…" : "") : "알 수 없는 오류"}
                                </span>
                              ) : log.message_sent ? (
                                <span className="text-[#87867f]">
                                  {log.message_sent.replace(/<[^>]+>/g, "").slice(0, 40)}…
                                </span>
                              ) : "—"}
                            </td>
                          </tr>

                          {/* 확장 상세 패널 */}
                          {expandedLog === log.id && (
                            <tr key={`${log.id}-detail`} className="border-b border-[#f0eee6]">
                              <td colSpan={6} className="px-5 py-4 bg-[#f5f4ed]">
                                {log.status === "failed" ? (
                                  <div>
                                    <p className="text-xs font-medium text-[#b53333] uppercase tracking-wide mb-2">오류 원인</p>
                                    <pre className="text-xs text-[#b53333] bg-[#b53333]/5 border border-[#b53333]/20 rounded-xl px-4 py-3 whitespace-pre-wrap break-all leading-relaxed">
                                      {log.error_reason || "오류 메시지가 기록되지 않았습니다."}
                                    </pre>
                                  </div>
                                ) : log.message_sent ? (
                                  <div>
                                    <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-2">발송된 메시지</p>
                                    <pre className="text-xs text-[#5e5d59] bg-white border border-[#f0eee6] rounded-xl px-4 py-3 whitespace-pre-wrap leading-relaxed">
                                      {log.message_sent.replace(/<b>/g, "").replace(/<\/b>/g, "").replace(/<[^>]+>/g, "")}
                                    </pre>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </AnimateIn>
        )}

        {activeTab === "alerts" && <AnimateIn from="bottom" delay={120}>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-[#87867f]">로딩 중...</div>
            ) : alerts.length === 0 ? (
              <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-12 text-center shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
                <div className="w-12 h-12 bg-[#e8e6dc] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Bell size={20} className="text-[#87867f]" />
                </div>
                <p className="text-[#87867f] text-sm mb-5">설정된 알람이 없습니다</p>
                <button onClick={() => setShowAddForm(true)}
                  className="px-5 py-2.5 bg-[#c96442] text-[#faf9f5] rounded-xl text-sm font-medium hover:bg-[#b8573b] transition-colors">
                  첫 번째 알람 추가
                </button>
              </div>
            ) : (
              <>
                {displayAlerts.map((alert) => (
                  <div key={alert.id}
                    className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-5 hover:border-[#c96442] hover:shadow-[0px_0px_0px_1px_#c96442] transition-all shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-[#e8e6dc] rounded-lg text-[#5e5d59] shrink-0">
                          {alertTypeIcons[alert.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-[#141413]">{alert.symbol}</span>
                            <span className="px-2 py-0.5 bg-[#e8e6dc] rounded-full text-xs text-[#5e5d59]">
                              {alertTypeLabels[alert.type]}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${alert.enabled ? "bg-[#2d6a4f]/10 text-[#2d6a4f]" : "bg-[#e8e6dc] text-[#87867f]"}`}>
                              {alert.enabled ? "활성" : "비활성"}
                            </span>
                          </div>
                          <p className="text-xs text-[#87867f] mb-1">{alert.name}</p>
                          <p className="text-xs text-[#5e5d59]">
                            조건: <span className="font-medium">{alert.condition}</span>
                            {alert.threshold ? ` ${alert.threshold}` : ""}
                          </p>
                          <p className="text-xs text-[#87867f] mt-1">
                            채널: <span className="text-[#c96442] font-medium">
                              {alert.notificationChannels.length > 0 ? alert.notificationChannels.join(", ").toUpperCase() : "PUSH"}
                            </span>
                          </p>
                          {alert.scheduleEnabled && (
                            <p className="text-xs text-[#5e5d59] mt-1 flex items-center gap-1">
                              <Clock size={11} className="text-[#87867f]" />
                              {alert.scheduleType === "interval"
                                ? <span className="font-medium">{alert.scheduleStart}~{alert.scheduleEnd} / {alert.scheduleInterval}분 간격</span>
                                : <span className="font-medium">{alert.scheduleTime}</span>
                              }
                              <span className="text-[#87867f]">({alert.scheduleDays === "daily" ? "매일" : alert.scheduleDays === "weekdays" ? "평일" : alert.scheduleDays})</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleRunAlert(alert.id)}
                          disabled={runningId === alert.id}
                          className="p-2 hover:bg-[#2d6a4f]/10 rounded-lg transition-colors text-[#2d6a4f] disabled:opacity-40"
                          title="지금 실행">
                          <Play size={15} />
                        </button>
                        <button onClick={() => startEdit(alert)}
                          className="p-2 hover:bg-[#5e5d59]/10 rounded-lg transition-colors text-[#5e5d59]"
                          title="편집">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleToggleAlert(alert.id)}
                          className={`p-2 rounded-lg transition-colors ${alert.enabled ? "hover:bg-[#92600a]/10 text-[#92600a]" : "hover:bg-[#2d6a4f]/10 text-[#2d6a4f]"}`}
                          title={alert.enabled ? "비활성화" : "활성화"}>
                          <ToggleLeft size={17} />
                        </button>
                        <button onClick={() => handleDeleteAlert(alert.id)}
                          className="p-2 hover:bg-[#b53333]/10 rounded-lg transition-colors text-[#b53333]" title="삭제">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {alerts.length > pagination.pageSize && (
                  <Pagination state={pagination} pageRange={pagination.pageRange}
                    hasNextPage={pagination.hasNextPage} hasPrevPage={pagination.hasPrevPage}
                    onPreviousPage={pagination.prevPage} onNextPage={pagination.nextPage}
                    onGoToPage={pagination.goToPage} onChangePageSize={pagination.changePageSize} />
                )}
              </>
            )}
          </div>
        </AnimateIn>}

        {/* Run result modal */}
        {runResult && (() => {
          const s = runResult.snapshot as Record<string, unknown> | undefined
          const triggered = runResult.status === "triggered"
          const msgs = runResult.triggered_alerts as string[] | undefined
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/50">
              <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-6 w-full max-w-md shadow-[rgba(0,0,0,0.15)_0px_16px_48px] mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-[#141413]" style={{ fontFamily: "Georgia, serif" }}>
                    실행 결과 — {s?.symbol as string}
                  </h3>
                  <button onClick={() => setRunResult(null)} className="text-[#87867f] hover:text-[#141413] text-lg leading-none">×</button>
                </div>

                <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm font-medium ${triggered ? "bg-[#2d6a4f]/10 text-[#2d6a4f]" : "bg-[#e8e6dc] text-[#5e5d59]"}`}>
                  {triggered ? `🚨 조건 충족 (${(runResult.triggered_count as number)}개)` : "✅ 조건 미충족"} — 텔레그램 발송 완료
                </div>

                {msgs && msgs.length > 0 && (
                  <div className="mb-4 space-y-1">
                    {msgs.map((m, i) => <p key={i} className="text-xs text-[#c96442]">• {m}</p>)}
                  </div>
                )}

                {s && (
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-[#f0eee6]">
                      <span className="text-xs text-[#87867f]">현재가</span>
                      <span className="text-sm font-medium text-[#141413]">${s.price as number}</span>
                    </div>
                    {[["MA5", s.ma5], ["MA20", s.ma20], ["MA50", s.ma50], ["MA120", s.ma120], ["MA200", s.ma200]].map(([label, val]) => val && (
                      <div key={label as string} className="flex justify-between py-1.5 border-b border-[#f0eee6]/50">
                        <span className="text-xs text-[#87867f]">{label as string}</span>
                        <span className="text-xs font-medium text-[#141413]">
                          ${(val as number).toFixed(2)}
                          <span className={`ml-1.5 ${(s.price as number) > (val as number) ? "text-[#2d6a4f]" : "text-[#b53333]"}`}>
                            {(s.price as number) > (val as number) ? "↑" : "↓"}
                          </span>
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-b border-[#f0eee6]">
                      <span className="text-xs text-[#87867f]">RSI</span>
                      <span className="text-xs font-medium text-[#141413]">{s.rsi ? `${s.rsi}` : "—"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[#f0eee6]">
                      <span className="text-xs text-[#87867f]">Drawdown</span>
                      <span className="text-xs font-medium text-[#141413]">{s.drawdown_pct ? `${s.drawdown_pct}%` : "—"}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-[#87867f]">거래량 (1y평균 대비)</span>
                      <span className="text-xs font-medium text-[#141413]">
                        {(s.volume_vs_avg_pct as number) >= 0 ? "+" : ""}{s.volume_vs_avg_pct as number}%
                      </span>
                    </div>
                  </div>
                )}

                <button onClick={() => setRunResult(null)}
                  className="w-full mt-5 py-2.5 bg-[#e8e6dc] hover:bg-[#d1cfc5] text-[#4d4c48] rounded-xl text-sm font-medium transition-colors">
                  닫기
                </button>
              </div>
            </div>
          )
        })()}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
