"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from "lightweight-charts"

interface MAChartProps {
  symbol: string
  timeframe: "1D" | "1W"
  height?: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const MA_LINES = [
  { period: 5,   color: "#c96442", label: "MA5" },
  { period: 20,  color: "#3898ec", label: "MA20" },
  { period: 50,  color: "#92600a", label: "MA50" },
  { period: 120, color: "#7c3aed", label: "MA120" },
  { period: 200, color: "#b53333", label: "MA200" },
]

function calcMA(data: { time: number; close: number }[], w: number) {
  return data
    .map((c, i) => {
      if (i < w - 1) return null
      const avg = data.slice(i - w + 1, i + 1).reduce((s, x) => s + x.close, 0) / w
      return { time: c.time, value: parseFloat(avg.toFixed(4)) }
    })
    .filter(Boolean) as { time: number; value: number }[]
}

export function MAChart({ symbol, timeframe, height = 420 }: MAChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")
  const [visibleMAs, setVisibleMAs] = useState<Set<number>>(new Set([5, 20, 50, 120, 200]))

  useEffect(() => {
    if (!containerRef.current || !symbol) return
    setStatus("loading")

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const interval = timeframe === "1W" ? "1wk" : "1d"
    const period = timeframe === "1W" ? "10y" : "2y"
    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/chart/${symbol}?interval=${interval}&period=${period}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const raw: { timestamp: string; open: number; high: number; low: number; close: number; volume: number }[] = data.candles || []
        if (raw.length === 0) throw new Error("데이터 없음")
        if (cancelled || !containerRef.current) return

        const seen = new Set<number>()
        const candles = raw
          .map(c => ({
            time: Math.floor(new Date(c.timestamp).getTime() / 1000),
            open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
          }))
          .sort((a, b) => a.time - b.time)
          .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true })

        const chart = createChart(containerRef.current!, {
          layout: {
            background: { type: ColorType.Solid, color: "#faf9f5" },
            textColor: "#87867f",
            fontSize: 11,
          },
          grid: {
            vertLines: { color: "#f0eee6" },
            horzLines: { color: "#f0eee6" },
          },
          crosshair: { mode: 1 },
          timeScale: { timeVisible: false, borderColor: "#f0eee6" },
          rightPriceScale: { borderColor: "#f0eee6" },
          width: containerRef.current.clientWidth,
          height,
        })
        chartRef.current = chart

        // Candlestick
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#2d6a4f",
          downColor: "#b53333",
          borderUpColor: "#2d6a4f",
          borderDownColor: "#b53333",
          wickUpColor: "#2d6a4f",
          wickDownColor: "#b53333",
        })
        candleSeries.setData(candles)

        // MA lines
        for (const ma of MA_LINES) {
          if (!visibleMAs.has(ma.period) || candles.length < ma.period) continue
          const maSeries = chart.addSeries(LineSeries, {
            color: ma.color,
            lineWidth: ma.period >= 120 ? 2 : 1,
            priceLineVisible: false,
            lastValueVisible: true,
            title: ma.label,
          })
          maSeries.setData(calcMA(candles, ma.period))
        }

        // Volume
        const volSeries = chart.addSeries(HistogramSeries, {
          color: "#e8e6dc",
          priceFormat: { type: "volume" },
          priceScaleId: "vol",
        })
        chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
        volSeries.setData(candles.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? "#2d6a4f30" : "#b5333330",
        })))

        chart.timeScale().fitContent()
        setStatus("ok")

        const onResize = () => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
          }
        }
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
      } catch (e: unknown) {
        if (!cancelled) setStatus("error")
      }
    }

    run()
    return () => {
      cancelled = true
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }
    }
  }, [symbol, timeframe, visibleMAs, height])

  const toggleMA = (period: number) => {
    setVisibleMAs(prev => {
      const next = new Set(prev)
      if (next.has(period)) next.delete(period)
      else next.add(period)
      return next
    })
  }

  return (
    <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl overflow-hidden shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
      {/* Legend / toggles */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0eee6]">
        <span className="text-xs font-medium text-[#87867f] uppercase tracking-wide">
          {symbol} · {timeframe === "1W" ? "주봉" : "일봉"}
        </span>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {MA_LINES.map(ma => (
            <button
              key={ma.period}
              type="button"
              onClick={() => toggleMA(ma.period)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                visibleMAs.has(ma.period)
                  ? "text-white border-transparent"
                  : "bg-[#f5f4ed] text-[#b0aea5] border-[#f0eee6]"
              }`}
              style={visibleMAs.has(ma.period) ? { backgroundColor: ma.color, borderColor: ma.color } : {}}
            >
              {ma.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative" style={{ height }}>
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center text-[#87867f] text-sm">
            차트 로딩 중...
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center text-[#87867f] text-sm">
            차트를 불러올 수 없습니다
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ visibility: status === "ok" ? "visible" : "hidden" }}
        />
      </div>
    </div>
  )
}
