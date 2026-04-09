"use client"

import { useEffect, useState } from "react"

interface Signal {
  id: string
  timestamp: string
  symbol: string
  type: "ACTION" | "WARNING" | "INFO"
  title: string
  details: string
}

const TYPE_COLORS: Record<string, string> = {
  ACTION: "text-signal-red border-signal-red/30 bg-signal-red/5",
  WARNING: "text-signal-amber border-signal-amber/30 bg-signal-amber/5",
  INFO: "text-muted-foreground border-border bg-muted/30",
}

const TYPE_EMOJI: Record<string, string> = {
  ACTION: "🚨",
  WARNING: "⚠️",
  INFO: "ℹ️",
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const WS_BASE = API_BASE.replace("http://", "ws://").replace("https://", "wss://")

export function SignalFeed() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)

  useEffect(() => {
    const fetchSignals = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/signals/recent?limit=50`)
        if (res.ok) {
          const data = await res.json()
          const list = (data.signals || []).map((s: any) => ({
            id: String(s.id),
            timestamp: s.created_at || s.timestamp,
            symbol: s.symbol,
            type: s.severity === "HIGH" ? "ACTION" : s.severity === "MEDIUM" ? "WARNING" : "INFO",
            title: s.signal_type,
            details: s.message,
          }))
          setSignals(list)
        }
      } catch {
        // no-op: API unavailable
      } finally {
        setLoading(false)
      }
    }

    fetchSignals()

    // WebSocket
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(`${WS_BASE}/ws/signals`)
      ws.onopen = () => setWsConnected(true)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.signals) {
            setSignals(data.signals.map((s: any) => ({
              id: String(s.id),
              timestamp: s.created_at || s.timestamp,
              symbol: s.symbol,
              type: s.severity === "HIGH" ? "ACTION" : s.severity === "MEDIUM" ? "WARNING" : "INFO",
              title: s.signal_type,
              details: s.message,
            })))
          }
        } catch { /* ignore */ }
      }
      ws.onerror = () => setWsConnected(false)
      ws.onclose = () => setWsConnected(false)
    } catch { /* WebSocket unavailable */ }

    const pollInterval = setInterval(fetchSignals, 30_000)

    return () => {
      clearInterval(pollInterval)
      if (ws) ws.close()
    }
  }, [])

  const formatTime = (isoString: string) => {
    if (!isoString) return ""
    const date = new Date(isoString)
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000)
    if (diffMins < 1) return "now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex flex-col h-full bg-card/30 p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Signal Feed</h2>
          <p className="text-xs text-muted-foreground">
            {wsConnected ? "● 실시간" : `${signals.length}개`}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-8">로딩 중...</p>
        ) : signals.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-muted-foreground">시그널 없음</p>
            <p className="text-xs text-muted-foreground mt-1">시그널 피드 페이지에서 스캔하세요</p>
          </div>
        ) : (
          signals.map((signal) => (
            <div
              key={signal.id}
              className={`rounded-lg border px-2.5 py-2 text-xs transition ${TYPE_COLORS[signal.type] || TYPE_COLORS.INFO}`}
            >
              <div className="flex items-start justify-between mb-0.5">
                <span className="font-semibold">
                  {TYPE_EMOJI[signal.type]} {signal.symbol}
                </span>
                <span className="text-xs opacity-60">{formatTime(signal.timestamp)}</span>
              </div>
              <p className="opacity-80 font-mono text-xs">{signal.title}</p>
              <p className="opacity-50 font-mono text-xs truncate">{signal.details}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
