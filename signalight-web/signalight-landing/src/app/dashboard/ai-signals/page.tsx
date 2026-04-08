"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Zap, TrendingUp, AlertTriangle, RefreshCw, Play, BarChart2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"
import Link from "next/link"

interface Signal {
  id?: number
  symbol: string
  signal_type: string
  severity?: string
  message: string
  price?: number
  created_at?: string
  timestamp?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const SEVERITY_STYLE: Record<string, string> = {
  HIGH:   "bg-red-600/10 text-red-600 border-red-600/30",
  MEDIUM: "bg-yellow-600/10 text-yellow-600 border-yellow-600/30",
  LOW:    "bg-blue-600/10 text-blue-600 border-blue-600/30",
}

const SIGNAL_ICON: Record<string, React.ReactNode> = {
  BUY:         <TrendingUp size={16} className="text-green-600" />,
  SELL:        <TrendingUp size={16} className="text-red-600 rotate-180" />,
  STRONG_BUY:  <TrendingUp size={16} className="text-green-600" />,
  STRONG_SELL: <TrendingUp size={16} className="text-red-600 rotate-180" />,
  WARNING:     <AlertTriangle size={16} className="text-yellow-600" />,
}

export default function SignalsPage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [stats, setStats] = useState({ total: 0, buy: 0, sell: 0, warning: 0 })
  const [filterSymbol, setFilterSymbol] = useState("")
  const [lastScan, setLastScan] = useState<string>("")

  const loadSignals = useCallback(async () => {
    setLoading(true)
    try {
      const url = filterSymbol
        ? `${API_BASE}/api/signals/recent?symbol=${filterSymbol}`
        : `${API_BASE}/api/signals/recent?limit=100`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("시그널 로드 실패")
      const data = await res.json()
      const list: Signal[] = data.signals || []
      setSignals(list)

      // Compute stats
      setStats({
        total: list.length,
        buy: list.filter((s) => s.signal_type?.includes("BUY")).length,
        sell: list.filter((s) => s.signal_type?.includes("SELL")).length,
        warning: list.filter((s) => s.signal_type?.includes("WARNING") || s.severity === "HIGH").length,
      })
    } catch {
      showError("시그널 데이터를 불러오지 못했습니다")
    } finally {
      setLoading(false)
    }
  }, [token, filterSymbol])

  useEffect(() => {
    loadSignals()
    const timer = setInterval(loadSignals, 60_000)
    return () => clearInterval(timer)
  }, [loadSignals])

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await fetch(`${API_BASE}/api/scan/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("스캔 실패")
      const data = await res.json()
      setLastScan(new Date().toLocaleTimeString("ko-KR"))
      success(`스캔 완료 — ${data.scanned}개 종목, ${data.count}개 시그널`)
      await loadSignals()
    } catch {
      showError("스캔에 실패했습니다")
    } finally {
      setScanning(false)
    }
  }

  const filtered = filterSymbol
    ? signals.filter((s) => s.symbol?.toUpperCase().includes(filterSymbol.toUpperCase()))
    : signals

  const formatTime = (s: Signal) => {
    const ts = s.created_at || s.timestamp
    if (!ts) return ""
    try {
      return new Date(ts).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    } catch { return ts }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">시그널 피드</h1>
              <p className="text-muted-foreground text-sm">
                스캔 엔진에서 감지된 실제 시그널 · 1분 자동갱신
                {lastScan && <span className="ml-2">마지막 스캔: {lastScan}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadSignals}
                disabled={loading}
                className="p-2 hover:bg-muted rounded-lg transition-all"
                title="새로고침"
              >
                <RefreshCw size={18} className={loading ? "animate-spin text-blue-600" : ""} />
              </button>
              <button
                onClick={handleScan}
                disabled={scanning}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
              >
                {scanning ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                {scanning ? "스캔 중..." : "지금 스캔"}
              </button>
            </div>
          </div>
        </AnimateIn>

        {/* 통계 */}
        <AnimateIn from="bottom" delay={80}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "총 시그널", value: stats.total, color: "text-foreground" },
              { label: "매수", value: stats.buy, color: "text-green-600" },
              { label: "매도", value: stats.sell, color: "text-red-600" },
              { label: "경고", value: stats.warning, color: "text-yellow-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card border border-border rounded-lg p-5">
                <p className="text-sm text-muted-foreground mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </AnimateIn>

        {/* 필터 */}
        <AnimateIn from="bottom" delay={120}>
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <input
              type="text"
              placeholder="종목 심볼로 필터 (예: AAPL)"
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value.toUpperCase())}
              className="w-full max-w-xs px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
            />
          </div>
        </AnimateIn>

        {/* 시그널 목록 */}
        <AnimateIn from="bottom" delay={160}>
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">
              <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
              <p>로딩 중...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Zap className="mx-auto mb-4 text-muted-foreground opacity-40" size={48} />
              <p className="text-muted-foreground mb-2">
                {filterSymbol ? `${filterSymbol}에 대한 시그널이 없습니다` : "최근 7일간 시그널이 없습니다"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                &quot;지금 스캔&quot; 버튼으로 워치리스트를 스캔하세요
              </p>
              <button
                onClick={handleScan}
                disabled={scanning}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2 mx-auto"
              >
                <Play size={16} />
                스캔 시작
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((sig, idx) => (
                <div
                  key={sig.id || idx}
                  className={`bg-card border rounded-lg p-5 transition-colors hover:border-blue-600 ${
                    SEVERITY_STYLE[sig.severity || "LOW"] || "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {SIGNAL_ICON[sig.signal_type] || <Zap size={16} className="text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-lg font-bold">{sig.symbol}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-muted">
                            {sig.signal_type}
                          </span>
                          {sig.severity && (
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${SEVERITY_STYLE[sig.severity] || ""}`}>
                              {sig.severity}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{sig.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {sig.price && <span>가격: ${sig.price.toFixed(2)}</span>}
                          <span>{formatTime(sig)}</span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/charts?symbol=${sig.symbol}`}
                      className="p-2 hover:bg-muted rounded-lg text-blue-600 shrink-0"
                      title="차트 보기"
                    >
                      <BarChart2 size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimateIn>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
