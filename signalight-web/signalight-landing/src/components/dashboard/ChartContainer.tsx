"use client"

import { useEffect, useRef, useState } from "react"
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts"

interface ChartContainerProps {
  symbol: string
  period: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const PERIOD_CONFIG: Record<string, { interval: string; period: string }> = {
  "1D": { interval: "5m",  period: "1d"  },
  "1W": { interval: "1h",  period: "5d"  },
  "1M": { interval: "1d",  period: "1mo" },
}

function toChartTime(isoTimestamp: string, isIntraday: boolean): number {
  // Always return Unix seconds — lightweight-charts v5 handles both number and string,
  // but using numbers avoids sorting/comparison bugs with timezone-aware ISO strings.
  return Math.floor(new Date(isoTimestamp).getTime() / 1000)
}

function calcMA(data: { time: any; close: number }[], w: number) {
  return data
    .map((c, i) => {
      if (i < w - 1) return null
      const avg = data.slice(i - w + 1, i + 1).reduce((s, x) => s + x.close, 0) / w
      return { time: c.time, value: parseFloat(avg.toFixed(2)) }
    })
    .filter(Boolean) as { time: any; value: number }[]
}

export function ChartContainer({ symbol, period }: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!containerRef.current || !symbol) return

    setStatus("loading")
    setErrorMsg("")

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const { interval, period: p } = PERIOD_CONFIG[period] || PERIOD_CONFIG["1D"]
    const isIntraday = ["1m", "5m", "15m", "30m", "1h"].includes(interval)
    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/chart/${symbol}?interval=${interval}&period=${p}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const raw: any[] = data.candles || []
        if (raw.length === 0) throw new Error("데이터 없음")
        if (cancelled || !containerRef.current) return

        // Map & deduplicate
        const seen = new Set<string>()
        const candles = raw
          .map((c) => ({
            time: toChartTime(c.timestamp, isIntraday),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          }))
          .sort((a, b) => (a.time as number) - (b.time as number))
          .filter((c) => {
            const k = String(c.time)
            if (seen.has(k)) return false
            seen.add(k)
            return true
          })

        const chart: any = createChart(containerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: "transparent" },
            textColor: "#9ca3af",
          },
          grid: {
            vertLines: { color: "#ffffff08" },
            horzLines: { color: "#ffffff08" },
          },
          crosshair: { mode: 1 },
          timeScale: { timeVisible: true, secondsVisible: isIntraday },
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 360,
        })
        chartRef.current = chart

        // v5 API: addSeries(SeriesType, options)
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#10b981",
          downColor: "#ef4444",
          borderUpColor: "#10b981",
          borderDownColor: "#ef4444",
          wickUpColor: "#10b981",
          wickDownColor: "#ef4444",
        })
        candleSeries.setData(candles)

        if (!isIntraday && candles.length >= 20) {
          const ma20s = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
          ma20s.setData(calcMA(candles, 20))
        }
        if (!isIntraday && candles.length >= 60) {
          const ma60s = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
          ma60s.setData(calcMA(candles, 60))
        }

        const volSeries = chart.addSeries(HistogramSeries, {
          color: "#6b7280",
          priceFormat: { type: "volume" },
          priceScaleId: "vol",
        })
        chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
        volSeries.setData(
          candles.map((c) => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? "#10b98140" : "#ef444440",
          }))
        )

        chart.timeScale().fitContent()
        setStatus("ok")

        const onResize = () => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: containerRef.current.clientWidth,
              height: containerRef.current.clientHeight,
            })
          }
        }
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(e.message || "차트 로드 실패")
          setStatus("error")
        }
      }
    }

    run()

    return () => {
      cancelled = true
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [symbol, period])

  return (
    <div className="relative w-full h-full" style={{ minHeight: "300px" }}>
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          차트 로딩 중...
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm text-center px-6">
          <div>
            <p className="mb-1">차트를 불러올 수 없습니다</p>
            <p className="text-xs opacity-60">{errorMsg}</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ visibility: status === "ok" ? "visible" : "hidden", minHeight: "300px" }}
      />
    </div>
  )
}
