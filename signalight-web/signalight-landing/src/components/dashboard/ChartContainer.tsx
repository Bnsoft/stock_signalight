"use client"

import { useEffect, useRef, useState } from "react"
import { createChart, ColorType } from "lightweight-charts"

interface ChartContainerProps {
  symbol: string
  period: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const PERIOD_TO_INTERVAL: Record<string, { interval: string; period: string }> = {
  "1D": { interval: "5m",  period: "1d"  },
  "1W": { interval: "1h",  period: "5d"  },
  "1M": { interval: "1d",  period: "1mo" },
}

function calculateMA(data: any[], window: number) {
  return data
    .map((candle, idx) => {
      if (idx < window - 1) return null
      const sum = data.slice(idx - window + 1, idx + 1).reduce((a, c) => a + c.close, 0)
      return { time: candle.time, value: parseFloat((sum / window).toFixed(2)) }
    })
    .filter(Boolean) as { time: any; value: number }[]
}

export function ChartContainer({ symbol, period }: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!containerRef.current || !symbol) return
    setError("")
    setLoading(true)

    const { interval, period: p } = PERIOD_TO_INTERVAL[period] || PERIOD_TO_INTERVAL["1D"]

    let cleanup: (() => void) | undefined

    const fetchAndRender = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/chart/${symbol}?interval=${interval}&period=${p}`)
        if (!res.ok) throw new Error(`차트 데이터 없음 (${res.status})`)
        const data = await res.json()
        const candles: any[] = data.candles || []
        if (candles.length === 0) throw new Error("데이터 없음")

        setLoading(false)

        if (!containerRef.current) return

        const chart: any = createChart(containerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: "transparent" },
            textColor: "#9ca3af",
          },
          grid: {
            vertLines: { color: "#1f2937" },
            horzLines: { color: "#1f2937" },
          },
          timeScale: { timeVisible: true, secondsVisible: false },
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 400,
        })

        const candleSeries = chart.addCandlestickSeries({
          upColor: "#10b981",
          downColor: "#ef4444",
          borderUpColor: "#10b981",
          borderDownColor: "#ef4444",
          wickUpColor: "#10b981",
          wickDownColor: "#ef4444",
        })
        candleSeries.setData(candles)

        if (candles.length >= 20) {
          const ma20 = calculateMA(candles, 20)
          const ma20Series = chart.addLineSeries({ color: "#3b82f6", lineWidth: 1 })
          ma20Series.setData(ma20)
        }

        if (candles.length >= 60) {
          const ma60 = calculateMA(candles, 60)
          const ma60Series = chart.addLineSeries({ color: "#f59e0b", lineWidth: 1 })
          ma60Series.setData(ma60)
        }

        const volumeSeries = chart.addHistogramSeries({
          color: "#6b7280",
          priceFormat: { type: "volume" },
          priceScaleId: "",
          scaleMargins: { top: 0.8, bottom: 0 },
        })
        volumeSeries.setData(
          candles.map((c: any) => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? "#10b98133" : "#ef444433",
          }))
        )

        chart.timeScale().fitContent()

        const handleResize = () => {
          if (containerRef.current) {
            chart.applyOptions({
              width: containerRef.current.clientWidth,
              height: containerRef.current.clientHeight,
            })
          }
        }
        window.addEventListener("resize", handleResize)

        cleanup = () => {
          window.removeEventListener("resize", handleResize)
          chart.remove()
        }
      } catch (e: any) {
        setError(e.message || "차트 로드 실패")
        setLoading(false)
      }
    }

    fetchAndRender()

    return () => {
      cleanup?.()
    }
  }, [symbol, period])

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
        차트 로딩 중...
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
        {error}
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: "300px" }} />
}
