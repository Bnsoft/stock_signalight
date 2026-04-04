"use client"

"use client"

import { useEffect, useState } from "react"

interface Indicator {
  name: string
  value: string | number
  color?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const MOCK_INDICATORS: Indicator[] = [
  { name: "RSI", value: 46.5, color: "text-yellow-400" },
  { name: "MA20", value: "$590.17" },
  { name: "MA60", value: "$606.18" },
  { name: "VWAP", value: "$598.42" },
  { name: "Stoch K", value: "35.2" },
  { name: "Stoch D", value: "38.1" },
  { name: "ATR", value: "$8.24" },
  { name: "ADX", value: 22.3 },
  { name: "Volume", value: "1.08× avg" },
]

export function IndicatorPanel({ symbol }: { symbol: string }) {
  const [indicators, setIndicators] = useState<Indicator[]>(MOCK_INDICATORS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchIndicators = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/indicators?symbol=${symbol}`)
        if (res.ok) {
          const data = await res.json()
          const ind = data.indicators
          const formatted = [
            { name: "Price", value: `$${ind.current_price?.toFixed(2)}` },
            { name: "RSI", value: ind.rsi_14?.toFixed(1), color: "text-yellow-400" },
            { name: "MA20", value: `$${ind.ma_20?.toFixed(2)}` },
            { name: "MA60", value: `$${ind.ma_60?.toFixed(2)}` },
            { name: "VWAP", value: `$${ind.vwap?.toFixed(2)}` },
            { name: "Stoch K", value: ind.stoch_k?.toFixed(1) },
            { name: "Stoch D", value: ind.stoch_d?.toFixed(1) },
            { name: "ATR", value: `$${ind.atr?.toFixed(2)}` },
            { name: "ADX", value: ind.adx?.toFixed(1), color: ind.adx > 25 ? "text-signal-green" : "" },
            { name: "Volume", value: `${ind.volume_ratio?.toFixed(2)}×` },
          ].filter((i) => i.value !== undefined && i.value !== "NaN")
          setIndicators(formatted as Indicator[])
        }
      } catch (err) {
        console.log("Using mock indicators")
      } finally {
        setLoading(false)
      }
    }

    fetchIndicators()
    const interval = setInterval(fetchIndicators, 30000) // 30초마다 업데이트
    return () => clearInterval(interval)
  }, [symbol])

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Indicators {loading && "..."}</h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {indicators.map((ind) => (
          <div key={ind.name} className="bg-muted/50 rounded-lg p-2 text-center border border-border">
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
