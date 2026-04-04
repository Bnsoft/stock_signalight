"use client"

import { useEffect, useRef } from "react"
import { createChart, ColorType } from "lightweight-charts"

interface ChartContainerProps {
  symbol: string
  period: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function generateDummyCandles(count: number = 60) {
  const candles = []
  let time = Math.floor(Date.now() / 1000) - count * 86400
  let close = 580

  for (let i = 0; i < count; i++) {
    const volatility = Math.random() * 0.02
    const open = close
    const high = open * (1 + volatility)
    const low = open * (1 - volatility)
    close = low + Math.random() * (high - low)
    const volume = Math.floor(Math.random() * 100000000) + 50000000

    candles.push({
      time: Math.floor(time / 86400),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    })

    time += 86400
  }

  return candles
}

function calculateMA(data: any[], period: number) {
  return data.map((candle, idx) => {
    if (idx < period - 1) return null
    const sum = data
      .slice(idx - period + 1, idx + 1)
      .reduce((acc, c) => acc + c.close, 0)
    return {
      time: candle.time,
      value: parseFloat((sum / period).toFixed(2)),
    }
  })
}

export function ChartContainer({ symbol, period }: ChartContainerProps) {
  const chartContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartContainer.current) return

    const fetchAndRender = async () => {
      let candles: any[] = []

      try {
        const res = await fetch(
          `${API_BASE}/api/candles?symbol=${symbol}&period=${period}&limit=60`
        )
        if (res.ok) {
          const data = await res.json()
          candles = data.candles
        } else {
          candles = generateDummyCandles(60)
        }
      } catch (err) {
        candles = generateDummyCandles(60)
      }

      if (candles.length === 0) return

      const ma20 = calculateMA(candles, 20)
      const ma60 = calculateMA(candles, 60)

      const chart: any = createChart(chartContainer.current as HTMLElement, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#9ca3af",
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
        width: chartContainer.current?.clientWidth || 1000,
        height: chartContainer.current?.clientHeight || 400,
      })

      // Candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: "#10b981",
        downColor: "#ef4444",
        borderUpColor: "#10b981",
        borderDownColor: "#ef4444",
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      })
      candlestickSeries.setData(candles)

      // MA20
      const ma20Series = chart.addLineSeries({
        color: "#3b82f6",
        lineWidth: 1,
      })
      ma20Series.setData(ma20.filter((m) => m !== null) as any[])

      // MA60
      const ma60Series = chart.addLineSeries({
        color: "#f59e0b",
        lineWidth: 1,
      })
      ma60Series.setData(ma60.filter((m) => m !== null) as any[])

      // Volume
      const volumeSeries = chart.addHistogramSeries({
        color: "#6b7280",
        priceFormat: {
          type: "volume",
        },
      })
      const volumeData = candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? "#10b98133" : "#ef444433",
      }))
      volumeSeries.setData(volumeData)

      chart.timeScale().fitContent()

      const handleResize = () => {
        if (chartContainer.current) {
          chart.applyOptions({
            width: chartContainer.current.clientWidth,
            height: chartContainer.current.clientHeight,
          })
          chart.timeScale().fitContent()
        }
      }

      window.addEventListener("resize", handleResize)

      return () => {
        window.removeEventListener("resize", handleResize)
        chart.remove()
      }
    }

    fetchAndRender()
  }, [symbol, period])

  return (
    <div
      ref={chartContainer}
      className="w-full h-full"
      style={{ minHeight: "400px" }}
    />
  )
}
