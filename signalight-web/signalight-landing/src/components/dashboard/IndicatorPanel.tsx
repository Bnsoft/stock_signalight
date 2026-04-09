"use client"

import { useEffect, useState } from "react"

interface Indicator {
  name: string
  value: string | number
  color?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function IndicatorPanel({ symbol }: { symbol: string }) {
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!symbol) return

    const fetchIndicators = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/quote/${symbol}`)
        if (!res.ok) throw new Error("indicators load failed")
        const data = await res.json()
        const ind = data.indicators || {}

        const formatted: Indicator[] = [
          { name: "Price",  value: data.price != null ? `$${Number(data.price).toFixed(2)}` : "—" },
          { name: "RSI",    value: ind.rsi_14  != null ? Number(ind.rsi_14).toFixed(1)  : "—", color: ind.rsi_14 < 30 ? "text-green-500" : ind.rsi_14 > 70 ? "text-red-500" : "text-yellow-400" },
          { name: "MA20",   value: ind.ma_20   != null ? `$${Number(ind.ma_20).toFixed(2)}`  : "—" },
          { name: "MA60",   value: ind.ma_60   != null ? `$${Number(ind.ma_60).toFixed(2)}`  : "—" },
          { name: "VWAP",   value: ind.vwap    != null ? `$${Number(ind.vwap).toFixed(2)}`   : "—" },
          { name: "Stoch K",value: ind.stoch_k != null ? Number(ind.stoch_k).toFixed(1) : "—" },
          { name: "ATR",    value: ind.atr     != null ? `$${Number(ind.atr).toFixed(2)}`    : "—" },
          { name: "ADX",    value: ind.adx     != null ? Number(ind.adx).toFixed(1)    : "—", color: ind.adx > 25 ? "text-signal-green" : "" },
          { name: "Volume", value: ind.volume_ratio != null ? `${Number(ind.volume_ratio).toFixed(2)}×` : "—" },
        ].filter((i) => i.value !== "—")

        setIndicators(formatted)
      } catch {
        setIndicators([])
      } finally {
        setLoading(false)
      }
    }

    fetchIndicators()
    const interval = setInterval(fetchIndicators, 30_000)
    return () => clearInterval(interval)
  }, [symbol])

  if (loading) {
    return <p className="text-xs text-muted-foreground">지표 로딩 중...</p>
  }

  if (indicators.length === 0) {
    return <p className="text-xs text-muted-foreground">지표 없음</p>
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
        {indicators.map((ind) => (
          <div key={ind.name} className="bg-muted/50 rounded p-1.5 text-center border border-border">
            <p className="text-xs text-muted-foreground truncate">{ind.name}</p>
            <p className={`text-xs font-mono font-semibold truncate ${ind.color || "text-foreground"}`}>
              {ind.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
