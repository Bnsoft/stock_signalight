"use client"

interface Indicator {
  name: string
  value: string | number
  color?: string
}

const MOCK_INDICATORS: Indicator[] = [
  { name: "RSI", value: 46.5, color: "text-yellow-400" },
  { name: "MA20", value: "$590.17" },
  { name: "MA60", value: "$606.18" },
  { name: "VWAP", value: "$598.42" },
  { name: "Volume", value: "1.08× avg" },
  { name: "ATR", value: "$8.24" },
  { name: "ADX", value: 22.3 },
]

export function IndicatorPanel({ symbol }: { symbol: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Indicators</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {MOCK_INDICATORS.map((ind) => (
          <div key={ind.name} className="bg-muted/50 rounded-lg p-2.5 text-center border border-border">
            <p className="text-xs text-muted-foreground">{ind.name}</p>
            <p className={`text-sm font-mono font-semibold ${ind.color || "text-foreground"}`}>
              {ind.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
