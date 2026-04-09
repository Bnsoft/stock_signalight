"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, ColorType } from "lightweight-charts"

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

function toChartTime(isoTimestamp: string, isIntraday: boolean): number | string {
  const date = new Date(isoTimestamp)
  if (isIntraday) {
    // lightweight-charts expects Unix seconds for intraday
    return Math.floor(date.getTime() / 1000)
  }
  // For daily: YYYY-MM-DD string
  return isoTimestamp.split("T")[0]
}

function calculateMA(data: { time: any; close: number }[], window: number) {
  return data
    .map((c, idx) => {
      if (idx < window - 1) return null
      const sum = data.slice(idx - window + 1, idx + 1).reduce((a, x) => a + x.close, 0)
      return { time: c.time, value: parseFloat((sum / window).toFixed(2)) }
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

    // Destroy previous chart
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
        if (!res.ok) {
          const msg = await res.text().catch(() => res.statusText)
          throw new Error(`API 오류 ${res.status}: ${msg}`)
        }
        const data = await res.json()
        const raw: any[] = data.candles || []
        if (raw.length === 0) throw new Error("데이터 없음")

        if (cancelled || !containerRef.current) return

        // Transform to lightweight-charts format
        const candles = raw
          .map((c) => ({
            time: toChartTime(c.timestamp, isIntraday),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          }))
          // Sort ascending (required by lightweight-charts)
          .sort((a, b) => (a.time as any) - (b.time as any))

        // Remove duplicate timestamps
        const seen = new Set()
        const deduped = candles.filter((c) => {
          const key = String(c.time)
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

        const chart: any = createChart(containerRef.current!, {
          layout: {
            background: { type: ColorType.Solid, color: "transparent" },
            textColor: "#9ca3af",
          },
          grid: {
            vertLines: { color: "#1f293730" },
            horzLines: { color: "#1f293730" },
          },
          crosshair: { mode: 1 },
          timeScale: { timeVisible: true, secondsVisible: isIntraday },
          width: containerRef.current!.clientWidth,
          height: containerRef.current!.clientHeight || 360,
        })
        chartRef.current = chart

        // Candlestick
        const candleSeries = chart.addCandlestickSeries({
          upColor: "#10b981",
          downColor: "#ef4444",
          borderUpColor: "#10b981",
          borderDownColor: "#ef4444",
          wickUpColor: "#10b981",
          wickDownColor: "#ef4444",
        })
        candleSeries.setData(deduped)

        // MA lines (only for daily+ data)
        if (!isIntraday && deduped.length >= 20) {
          const ma20 = calculateMA(deduped, 20)
          const ma20s = chart.addLineSeries({ color: "#3b82f6", lineWidth: 1, priceLineVisible: false })
          ma20s.setData(ma20)
        }
        if (!isIntraday && deduped.length >= 60) {
          const ma60 = calculateMA(deduped, 60)
          const ma60s = chart.addLineSeries({ color: "#f59e0b", lineWidth: 1, priceLineVisible: false })
          ma60s.setData(ma60)
        }

        // Volume histogram
        const volSeries = chart.addHistogramSeries({
          color: "#6b7280",
          priceFormat: { type: "volume" },
          priceScaleId: "vol",
          scaleMargins: { top: 0.82, bottom: 0 },
        })
        chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
        volSeries.setData(
          deduped.map((c) => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? "#10b98140" : "#ef444440",
          }))
        )

        chart.timeScale().fitContent()
        setStatus("ok")

        const handleResize = () => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({
              width: containerRef.current.clientWidth,
              height: containerRef.current.clientHeight,
            })
          }
        }
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
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
        style={{ visibility: status === "ok" ? "visible" : "hidden" }}
      />
    </div>
  )
}
