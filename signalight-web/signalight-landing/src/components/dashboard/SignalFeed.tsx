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

const MOCK_SIGNALS: Signal[] = [
  {
    id: "1",
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    symbol: "TQQQ",
    type: "ACTION",
    title: "RSI Oversold",
    details: "RSI: 28.3 | Price: $42.15",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    symbol: "QQQ",
    type: "WARNING",
    title: "MA Death Cross",
    details: "MA20: $443.20 < MA60: $447.80",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    symbol: "SPY",
    type: "INFO",
    title: "Volume Spike",
    details: "Vol: 2.4× avg | 84.2M",
  },
]

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

export function SignalFeed() {
  const [signals, setSignals] = useState<Signal[]>(MOCK_SIGNALS)

  useEffect(() => {
    // TODO: WebSocket이나 polling으로 실시간 신호 받기
    // /api/signals 엔드포인트에서 fetch
  }, [])

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return "now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex flex-col h-full rounded-lg border border-border bg-card p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Signal Feed</h2>
        <p className="text-xs text-muted-foreground">Latest {signals.length} signals</p>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto">
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No signals yet. Waiting for market events...
          </p>
        ) : (
          signals.map((signal) => (
            <div
              key={signal.id}
              className={`rounded-lg border px-3 py-2.5 text-xs transition ${TYPE_COLORS[signal.type]}`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-semibold">
                  {TYPE_EMOJI[signal.type]} {signal.symbol}
                </span>
                <span className="text-xs opacity-60">{formatTime(signal.timestamp)}</span>
              </div>
              <p className="opacity-80 font-mono">{signal.title}</p>
              <p className="opacity-50 font-mono">{signal.details}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
