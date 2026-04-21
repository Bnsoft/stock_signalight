"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Plus, Trash2, Play, ToggleLeft, Clock, FileBarChart, Pencil } from "lucide-react"
import { ToastContainer } from "@/components/ToastContainer"
import { useToast } from "@/hooks/useToast"
import { MAChart } from "@/components/dashboard/MAChart"

interface Subscription {
  id: number
  name: string
  symbols: string[]
  report_time: string
  days: string
  channels: string[]
  is_active: boolean
  created_at: string
}

interface HistoryEntry {
  id: number
  subscription_id: number
  subscription_name: string
  sent_at: string
  status: "success" | "failed"
  content?: string
  error_reason?: string
  channels: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const inputCls = "w-full px-4 py-2.5 bg-white border border-[#f0eee6] rounded-xl text-sm text-[#141413] focus:outline-none focus:border-[#3898ec] transition-colors"
const labelCls = "block text-xs font-medium text-[#87867f] mb-1.5 uppercase tracking-wide"

const DAY_OPTIONS = [
  { value: "daily", label: "매일" },
  { value: "weekdays", label: "평일 (월-금)" },
  { value: "MON,WED,FRI", label: "월·수·금" },
  { value: "MON", label: "매주 월요일" },
]

export default function ReportsPage() {
  const { user, token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()

  const [subs, setSubs] = useState<Subscription[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"subs" | "history">("subs")
  const [showForm, setShowForm] = useState(false)
  const [runningId, setRunningId] = useState<number | null>(null)
  const [expandedLog, setExpandedLog] = useState<number | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; type: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [chartSymbol, setChartSymbol] = useState<string | null>(null)
  const [chartTimeframe, setChartTimeframe] = useState<"1D" | "1W">("1D")

  const defaultForm = {
    name: "", symbols: "", report_time: "08:00",
    days: "weekdays", channels: [] as string[],
  }
  const [form, setForm] = useState(defaultForm)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)

  // 마지막으로 입력된 토큰(공백/쉼표 이후 현재 입력중인 심볼)을 검색
  const handleSymbolInput = useCallback((raw: string) => {
    setForm(f => ({ ...f, symbols: raw.toUpperCase() }))
    const parts = raw.split(/[\s,]+/)
    const current = parts[parts.length - 1].trim()
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (current.length < 1) { setSearchResults([]); setShowDropdown(false); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(current)}`)
        const data = await res.json()
        setSearchResults(data.results || [])
        setShowDropdown(true)
      } catch { setSearchResults([]) }
    }, 250)
  }, [])

  const selectSymbol = (sym: string) => {
    const parts = form.symbols.split(/[\s,]+/).filter(Boolean)
    parts[parts.length > 0 ? parts.length - 1 : 0] = sym
    setForm(f => ({ ...f, symbols: parts.join(" ") + " " }))
    setShowDropdown(false)
    setSearchResults([])
    setChartSymbol(sym)
  }

  const load = async () => {
    if (!user?.user_id) return
    setLoading(true)
    try {
      const [subRes, histRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/subscriptions?user_id=${user.user_id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/reports/history?user_id=${user.user_id}&limit=50`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (subRes.ok) setSubs((await subRes.json()).subscriptions || [])
      if (histRes.ok) setHistory((await histRes.json()).history || [])
    } catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [user?.user_id])

  const handleCreate = async () => {
    const symbols = form.symbols.split(/[\s,]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
    if (!form.name || symbols.length === 0 || !form.report_time) {
      showError("이름, 심볼, 시간을 입력하세요")
      return
    }
    if (form.channels.length === 0) { showError("알림 채널을 선택하세요"); return }
    try {
      const res = await fetch(`${API_BASE}/api/reports/subscriptions?user_id=${user?.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: form.name, symbols, report_time: form.report_time, days: form.days, channels: form.channels }),
      })
      if (!res.ok) throw new Error("생성 실패")
      success("리포트 구독이 추가되었습니다")
      setForm(defaultForm)
      setShowForm(false)
      await load()
    } catch (e: unknown) { showError(e instanceof Error ? e.message : "오류 발생") }
  }

  const startEdit = (sub: Subscription) => {
    setEditingSub(sub)
    setForm({
      name: sub.name,
      symbols: sub.symbols.join(" "),
      report_time: sub.report_time,
      days: sub.days,
      channels: sub.channels,
    })
    setChartSymbol(sub.symbols[0] || null)
    setShowForm(true)
  }

  const handleUpdate = async () => {
    if (!editingSub) return
    const symbols = form.symbols.split(/[\s,]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
    if (!form.name || symbols.length === 0) { showError("이름과 심볼을 입력하세요"); return }
    if (form.channels.length === 0) { showError("알림 채널을 선택하세요"); return }
    try {
      const res = await fetch(`${API_BASE}/api/reports/subscriptions/${editingSub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: form.name, symbols, report_time: form.report_time, days: form.days, channels: form.channels }),
      })
      if (!res.ok) throw new Error("수정 실패")
      success("리포트가 수정되었습니다")
      setEditingSub(null)
      setShowForm(false)
      setForm(defaultForm)
      await load()
    } catch (e: unknown) { showError(e instanceof Error ? e.message : "오류 발생") }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("이 리포트 구독을 삭제하시겠습니까?")) return
    try {
      await fetch(`${API_BASE}/api/reports/subscriptions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      success("삭제되었습니다")
      await load()
    } catch { showError("삭제 실패") }
  }

  const handleToggle = async (sub: Subscription) => {
    try {
      await fetch(`${API_BASE}/api/reports/subscriptions/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !sub.is_active }),
      })
      await load()
    } catch { showError("업데이트 실패") }
  }

  const handleRunNow = async (sub: Subscription) => {
    setRunningId(sub.id)
    try {
      const res = await fetch(`${API_BASE}/api/reports/subscriptions/${sub.id}/run?user_id=${user?.user_id}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.status === "success") success("리포트 발송 완료!")
      else showError(`발송 실패: ${data.error}`)
      await load()
    } catch { showError("실행 실패") } finally { setRunningId(null) }
  }

  const dayLabel = (d: string) => DAY_OPTIONS.find(o => o.value === d)?.label ?? d

  return (
    <div className="min-h-screen bg-[#f5f4ed] p-8">
      <div className="max-w-3xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-medium text-[#141413] leading-tight mb-1" style={{ fontFamily: "Georgia, serif" }}>
                리포트
              </h1>
              <p className="text-[#87867f] text-sm">정기적으로 주가 리포트를 텔레그램 또는 이메일로 받습니다</p>
            </div>
            {activeTab === "subs" && (
              <button onClick={() => { setEditingSub(null); setForm(defaultForm); setShowForm(v => !v) }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#c96442] hover:bg-[#b8573b] text-[#faf9f5] rounded-xl text-sm font-medium transition-colors">
                <Plus size={16} /> 새 구독
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-[#e8e6dc] rounded-xl p-1 w-fit">
            {[{ key: "subs", label: "구독 목록" }, { key: "history", label: "발송 기록" }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as "subs" | "history")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? "bg-[#faf9f5] text-[#141413] shadow-[rgba(0,0,0,0.06)_0px_2px_8px]" : "text-[#5e5d59] hover:text-[#141413]"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </AnimateIn>

        {/* Add form */}
        {activeTab === "subs" && showForm && (
          <AnimateIn from="bottom" delay={60}>
            <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-6 mb-5 shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
              <h2 className="text-base font-medium text-[#141413] mb-5" style={{ fontFamily: "Georgia, serif" }}>
                {editingSub ? "리포트 수정" : "새 리포트 구독"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>구독 이름</label>
                  <input type="text" placeholder="예: 오전 데일리 리포트" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                </div>
                <div className="relative" ref={dropdownRef}>
                  <label className={labelCls}>심볼 (쉼표 또는 공백 구분)</label>
                  <input
                    type="text"
                    placeholder="예: QQQ SPY AAPL TQQQ"
                    value={form.symbols}
                    onChange={e => handleSymbolInput(e.target.value)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    autoComplete="off"
                    className={inputCls}
                  />
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-[#faf9f5] border border-[#f0eee6] rounded-xl shadow-[rgba(0,0,0,0.1)_0px_8px_24px] overflow-hidden">
                      {searchResults.map(r => (
                        <button key={r.symbol} type="button" onMouseDown={() => selectSymbol(r.symbol)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#f5f4ed] text-left transition-colors">
                          <div>
                            <span className="font-medium text-sm text-[#141413]">{r.symbol}</span>
                            <span className="text-xs text-[#87867f] ml-2">{r.name}</span>
                          </div>
                          <span className="text-xs text-[#b0aea5] shrink-0">{r.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* 심볼 태그 — 클릭하면 차트 전환 */}
                  {form.symbols.trim() && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.symbols.split(/[\s,]+/).filter(Boolean).map(s => (
                        <button key={s} type="button" onClick={() => setChartSymbol(s)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-mono font-medium transition-colors ${chartSymbol === s ? "bg-[#c96442] text-[#faf9f5]" : "bg-[#e8e6dc] text-[#4d4c48] hover:bg-[#d1cfc5]"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* MA 차트 — col-span-2 */}
                {chartSymbol && (
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-[#87867f] uppercase tracking-wide">{chartSymbol} 이동평균선 차트</span>
                      <div className="flex gap-1 ml-auto">
                        {(["1D", "1W"] as const).map(tf => (
                          <button key={tf} type="button" onClick={() => setChartTimeframe(tf)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${chartTimeframe === tf ? "bg-[#141413] text-[#faf9f5]" : "bg-[#e8e6dc] text-[#5e5d59]"}`}>
                            {tf === "1D" ? "일봉" : "주봉"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <MAChart symbol={chartSymbol} timeframe={chartTimeframe} height={360} />
                  </div>
                )}
                <div>
                  <label className={labelCls}>발송 시간</label>
                  <input type="time" value={form.report_time}
                    onChange={e => setForm(f => ({ ...f, report_time: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>반복 요일</label>
                  <select value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} className={inputCls}>
                    {DAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-5">
                <label className={labelCls}>알림 채널</label>
                <div className="flex gap-4">
                  {["TELEGRAM", "EMAIL"].map(ch => (
                    <label key={ch} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.channels.includes(ch)}
                        onChange={e => setForm(f => ({
                          ...f,
                          channels: e.target.checked ? [...f.channels, ch] : f.channels.filter(c => c !== ch)
                        }))}
                        className="w-4 h-4 accent-[#c96442] rounded" />
                      <span className="text-sm text-[#5e5d59]">{ch === "TELEGRAM" ? "텔레그램" : "이메일"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={editingSub ? handleUpdate : handleCreate}
                  className="px-5 py-2.5 bg-[#c96442] hover:bg-[#b8573b] text-[#faf9f5] rounded-xl text-sm font-medium transition-colors">
                  {editingSub ? "수정 저장" : "추가"}
                </button>
                <button onClick={() => { setShowForm(false); setEditingSub(null); setForm(defaultForm) }}
                  className="px-5 py-2.5 bg-[#e8e6dc] hover:bg-[#d1cfc5] text-[#4d4c48] rounded-xl text-sm font-medium transition-colors">
                  취소
                </button>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Subscription list */}
        {activeTab === "subs" && (
          <AnimateIn from="bottom" delay={120}>
            {loading ? (
              <div className="text-center py-10 text-[#87867f]">로딩 중...</div>
            ) : subs.length === 0 ? (
              <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-12 text-center shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
                <div className="w-12 h-12 bg-[#e8e6dc] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FileBarChart size={20} className="text-[#87867f]" />
                </div>
                <p className="text-[#87867f] text-sm mb-5">등록된 리포트 구독이 없습니다</p>
                <button onClick={() => setShowForm(true)}
                  className="px-5 py-2.5 bg-[#c96442] text-[#faf9f5] rounded-xl text-sm font-medium hover:bg-[#b8573b] transition-colors">
                  첫 번째 구독 추가
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {subs.map(sub => (
                  <div key={sub.id}
                    className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-5 shadow-[rgba(0,0,0,0.05)_0px_4px_24px] hover:border-[#c96442] hover:shadow-[0px_0px_0px_1px_#c96442] transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-medium text-[#141413]">{sub.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sub.is_active ? "bg-[#2d6a4f]/10 text-[#2d6a4f]" : "bg-[#e8e6dc] text-[#87867f]"}`}>
                            {sub.is_active ? "활성" : "비활성"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {sub.symbols.map(s => (
                            <span key={s} className="px-2 py-0.5 bg-[#e8e6dc] rounded-lg text-xs font-mono font-medium text-[#4d4c48]">{s}</span>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#87867f]">
                          <span className="flex items-center gap-1"><Clock size={11} /> {sub.report_time}</span>
                          <span>{dayLabel(sub.days)}</span>
                          <span>{sub.channels.join(", ")}</span>
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleRunNow(sub)} disabled={runningId === sub.id}
                          title="지금 발송" className="p-2 hover:bg-[#2d6a4f]/10 rounded-lg text-[#2d6a4f] disabled:opacity-40 transition-colors">
                          <Play size={15} />
                        </button>
                        <button onClick={() => startEdit(sub)}
                          title="편집" className="p-2 hover:bg-[#5e5d59]/10 rounded-lg text-[#5e5d59] transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleToggle(sub)}
                          title={sub.is_active ? "비활성화" : "활성화"}
                          className={`p-2 rounded-lg transition-colors ${sub.is_active ? "hover:bg-[#92600a]/10 text-[#92600a]" : "hover:bg-[#2d6a4f]/10 text-[#2d6a4f]"}`}>
                          <ToggleLeft size={17} />
                        </button>
                        <button onClick={() => handleDelete(sub.id)} title="삭제"
                          className="p-2 hover:bg-[#b53333]/10 rounded-lg text-[#b53333] transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AnimateIn>
        )}

        {/* History tab — 구독명별 그룹화 */}
        {activeTab === "history" && (() => {
          const groups = history.reduce<Record<string, HistoryEntry[]>>((acc, h) => {
            const key = h.subscription_name || "미확인"
            if (!acc[key]) acc[key] = []
            acc[key].push(h)
            return acc
          }, {})

          return (
            <AnimateIn from="bottom" delay={60}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide">
                  구독별 발송 기록 ({Object.keys(groups).length}개 구독)
                </p>
                <button onClick={load} className="text-xs text-[#c96442] hover:underline">새로고침</button>
              </div>

              {history.length === 0 ? (
                <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl py-10 text-center text-[#87867f] text-sm">발송 기록이 없습니다</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groups).map(([subName, entries]) => {
                    const successCount = entries.filter(e => e.status === "success").length
                    const failCount = entries.filter(e => e.status === "failed").length
                    const isOpen = openGroups.has(subName)
                    const toggle = () => setOpenGroups(prev => { const next = new Set(prev); isOpen ? next.delete(subName) : next.add(subName); return next })

                    return (
                      <div key={subName} className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl overflow-hidden shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
                        <button onClick={toggle} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f5f4ed] transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-[#141413]">{subName}</span>
                            <span className="text-xs text-[#87867f]">{entries.length}건</span>
                            {successCount > 0 && <span className="px-2 py-0.5 bg-[#2d6a4f]/10 text-[#2d6a4f] rounded-full text-xs">✓ {successCount}</span>}
                            {failCount > 0 && <span className="px-2 py-0.5 bg-[#b53333]/10 text-[#b53333] rounded-full text-xs">✗ {failCount}</span>}
                          </div>
                          <span className="text-xs text-[#87867f]">{isOpen ? "▲" : "▼"}</span>
                        </button>

                        {isOpen && (
                          <div className="border-t border-[#f0eee6] overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[#f0eee6] bg-[#f5f4ed]">
                                  {["시간", "채널", "상태", "내용"].map(h => (
                                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-[#87867f] uppercase tracking-wide whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {entries.map(h => (
                                  <>
                                    <tr key={h.id} onClick={() => setExpandedLog(expandedLog === h.id ? null : h.id)}
                                      className={`border-b border-[#f0eee6]/50 cursor-pointer transition-colors ${h.status === "failed" ? "hover:bg-[#b53333]/5" : "hover:bg-[#f5f4ed]"}`}>
                                      <td className="px-4 py-2.5 text-xs text-[#87867f] whitespace-nowrap font-mono">
                                        {new Date(h.sent_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-[#87867f]">{h.channels}</td>
                                      <td className="px-4 py-2.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${h.status === "success" ? "bg-[#2d6a4f]/10 text-[#2d6a4f]" : "bg-[#b53333]/10 text-[#b53333]"}`}>
                                          {h.status === "success" ? "✓ 성공" : "✗ 실패"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-[#5e5d59] max-w-xs">
                                        {h.status === "failed"
                                          ? <span className="text-[#b53333]">⚠ {(h.error_reason || "").slice(0, 50)}</span>
                                          : <span className="text-[#87867f]">{(h.content || "").replace(/<[^>]+>/g, "").slice(0, 40)}…</span>}
                                      </td>
                                    </tr>
                                    {expandedLog === h.id && (
                                      <tr key={`${h.id}-d`} className="border-b border-[#f0eee6]">
                                        <td colSpan={4} className="px-5 py-4 bg-[#f5f4ed]">
                                          {h.status === "failed" ? (
                                            <pre className="text-xs text-[#b53333] bg-[#b53333]/5 border border-[#b53333]/20 rounded-xl px-4 py-3 whitespace-pre-wrap break-all">
                                              {h.error_reason || "오류 메시지 없음"}
                                            </pre>
                                          ) : (
                                            <pre className="text-xs text-[#5e5d59] bg-white border border-[#f0eee6] rounded-xl px-4 py-3 whitespace-pre-wrap leading-relaxed">
                                              {(h.content || "").replace(/<b>/g,"").replace(/<\/b>/g,"").replace(/<[^>]+>/g,"")}
                                            </pre>
                                          )}
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
                    )
                  })}
                </div>
              )}
            </AnimateIn>
          )
        })()}
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
