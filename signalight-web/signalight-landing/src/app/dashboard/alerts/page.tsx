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
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedType, setSelectedType] = useState("price")
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; type: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    symbol: "",
    condition: "greater",
    threshold: "",
    maPeriod: "20",
    maCondition: "CROSS_ABOVE",
    maTimeframe: "1D",
    volumeMultiplier: "2",
    notificationChannels: [] as string[],
  })

  useEffect(() => {
    loadAlerts()
  }, [])

  useEffect(() => {
    pagination.setTotal(alerts.length)
  }, [alerts])

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
  }

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
        })),
        ...(data.indicator_alerts || []).map((a: Record<string, unknown>) => ({
          id: `INDICATOR:${a.id}`, type: "ma", symbol: a.symbol as string,
          name: `${a.symbol} MA${a.threshold}(${a.timeframe})`, condition: a.condition as string,
          threshold: a.threshold as number, enabled: a.active as boolean,
          createdDate: "", notificationChannels: (a.notify_methods as string[]) || [],
        })),
        ...(data.volume_alerts || []).map((a: Record<string, unknown>) => ({
          id: `VOLUME:${a.id}`, type: "volume", symbol: a.symbol as string,
          name: `${a.symbol} 거래량알람`, condition: a.type as string,
          threshold: a.threshold as number, enabled: a.active as boolean,
          createdDate: "", notificationChannels: (a.notify_methods as string[]) || [],
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

      const response = await fetch(`${API_BASE}${endpoint}?user_id=${user?.user_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.detail || "Failed to create alert")
      }

      cache.remove(`/api/alerts`)
      success("알람이 추가되었습니다")
      setFormData({
        symbol: "",
        condition: "greater",
        threshold: "",
        maPeriod: "20",
        maCondition: "CROSS_ABOVE",
        maTimeframe: "1D",
        volumeMultiplier: "2",
        notificationChannels: [],
      })
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-medium text-[#141413] leading-tight mb-1" style={{ fontFamily: "Georgia, serif" }}>알람 관리</h1>
              <p className="text-[#87867f] text-sm">가격·이동평균선·거래량 알람을 설정하세요</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#c96442] hover:bg-[#b8573b] text-[#faf9f5] rounded-xl text-sm font-medium transition-colors shadow-[0px_0px_0px_1px_#c96442]"
            >
              <Plus size={16} /> 새 알람
            </button>
          </div>
        </AnimateIn>

        {showAddForm && (
          <AnimateIn from="bottom" delay={60}>
            <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-6 mb-5 shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
              <h2 className="text-base font-medium text-[#141413] mb-5" style={{ fontFamily: "Georgia, serif" }}>새 알람 추가</h2>

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

              <div className="flex gap-2">
                <button onClick={handleAddAlert}
                  className="px-5 py-2.5 bg-[#c96442] hover:bg-[#b8573b] text-[#faf9f5] rounded-xl text-sm font-medium transition-colors">
                  추가
                </button>
                <button onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 bg-[#e8e6dc] hover:bg-[#d1cfc5] text-[#4d4c48] rounded-xl text-sm font-medium transition-colors">
                  취소
                </button>
              </div>
            </div>
          </AnimateIn>
        )}

        <AnimateIn from="bottom" delay={120}>
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
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
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
        </AnimateIn>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
