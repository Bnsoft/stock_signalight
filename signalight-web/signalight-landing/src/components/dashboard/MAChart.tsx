"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from "lightweight-charts"

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface MAChartProps {
  symbol: string
  timeframe: "1D" | "1W"
  height?: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const MA_LINES = [
  { period: 5,   color: "#c96442", label: "MA5",   width: 1 },
  { period: 20,  color: "#3898ec", label: "MA20",  width: 1 },
  { period: 50,  color: "#92600a", label: "MA50",  width: 1 },
  { period: 120, color: "#7c3aed", label: "MA120", width: 2 },
  { period: 200, color: "#b53333", label: "MA200", width: 2 },
]

// Initial load: 3 years daily / 15 years weekly
const INITIAL_YEARS = { "1D": 3, "1W": 15 }
// How many years to fetch per "load more"
const CHUNK_YEARS = { "1D": 3, "1W": 10 }

function calcMA(data: Candle[], w: number) {
  const result: { time: number; value: number }[] = []
  for (let i = w - 1; i < data.length; i++) {
    let sum = 0
    for (let j = i - w + 1; j <= i; j++) sum += data[j].close
    result.push({ time: data[i].time, value: parseFloat((sum / w).toFixed(4)) })
  }
  return result
}

function dateToStr(d: Date) {
  return d.toISOString().split("T")[0]
}

function subtractYears(d: Date, y: number) {
  const r = new Date(d)
  r.setFullYear(r.getFullYear() - y)
  return r
}

async function fetchCandles(symbol: string, interval: string, start: Date, end: Date): Promise<Candle[]> {
  const params = new URLSearchParams({
    interval,
    start: dateToStr(start),
    end: dateToStr(end),
  })
  const res = await fetch(`${API_BASE}/api/chart/${symbol}?${params}`)
  if (!res.ok) return []
  const data = await res.json()
  const raw: { timestamp: string; open: number; high: number; low: number; close: number; volume: number }[] = data.candles || []

  const seen = new Set<number>()
  return raw
    .map(c => ({
      time: Math.floor(new Date(c.timestamp).getTime() / 1000),
      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
    }))
    .sort((a, b) => a.time - b.time)
    .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true })
}

export function MAChart({ symbol, timeframe, height = 420 }: MAChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef = useRef<{
    candle: ReturnType<typeof CandlestickSeries> | null
    vol: ReturnType<typeof HistogramSeries> | null
    mas: Map<number, ReturnType<typeof LineSeries>>
  }>({ candle: null, vol: null, mas: new Map() })
  const candlesRef = useRef<Candle[]>([])
  const oldestDateRef = useRef<Date>(new Date())
  const isLoadingMoreRef = useRef(false)
  const hasMoreRef = useRef(true)

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [visibleMAs, setVisibleMAs] = useState<Set<number>>(new Set([5, 20, 50, 120, 200]))
  const visibleMAsRef = useRef(visibleMAs)

  const interval = timeframe === "1W" ? "1wk" : "1d"

  const updateMASeries = useCallback((candles: Candle[], visible: Set<number>) => {
    const chart = chartRef.current
    if (!chart) return
    const s = seriesRef.current

    for (const ma of MA_LINES) {
      if (visible.has(ma.period)) {
        if (!s.mas.has(ma.period)) {
          const series = chart.addSeries(LineSeries, {
            color: ma.color,
            lineWidth: ma.width as 1 | 2,
            priceLineVisible: false,
            lastValueVisible: true,
            title: ma.label,
          })
          s.mas.set(ma.period, series)
        }
        if (candles.length >= ma.period) {
          s.mas.get(ma.period)!.setData(calcMA(candles, ma.period))
        }
      } else {
        if (s.mas.has(ma.period)) {
          try { chart.removeSeries(s.mas.get(ma.period)!) } catch {}
          s.mas.delete(ma.period)
        }
      }
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreRef.current || !chartRef.current) return
    isLoadingMoreRef.current = true
    setIsLoadingMore(true)

    try {
      const end = new Date(oldestDateRef.current)
      end.setDate(end.getDate() - 1)
      const start = subtractYears(end, CHUNK_YEARS[timeframe])

      const newCandles = await fetchCandles(symbol, interval, start, end)
      if (newCandles.length === 0) {
        hasMoreRef.current = false
        return
      }

      // Merge & deduplicate
      const existingTimes = new Set(candlesRef.current.map(c => c.time))
      const fresh = newCandles.filter(c => !existingTimes.has(c.time))
      if (fresh.length === 0) { hasMoreRef.current = false; return }

      candlesRef.current = [...fresh, ...candlesRef.current]
        .sort((a, b) => a.time - b.time)

      oldestDateRef.current = new Date(fresh[0].time * 1000)

      // Update series
      const s = seriesRef.current
      if (s.candle) s.candle.setData(candlesRef.current)
      if (s.vol) {
        s.vol.setData(candlesRef.current.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? "#2d6a4f30" : "#b5333330",
        })))
      }
      updateMASeries(candlesRef.current, visibleMAsRef.current)
    } finally {
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [symbol, timeframe, interval, updateMASeries])

  // Init chart
  useEffect(() => {
    if (!containerRef.current || !symbol) return
    setStatus("loading")
    hasMoreRef.current = true
    isLoadingMoreRef.current = false
    candlesRef.current = []

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }
    seriesRef.current = { candle: null, vol: null, mas: new Map() }

    let cancelled = false

    const run = async () => {
      try {
        const end = new Date()
        const start = subtractYears(end, INITIAL_YEARS[timeframe])

        const candles = await fetchCandles(symbol, interval, start, end)
        if (candles.length === 0) throw new Error("데이터 없음")
        if (cancelled || !containerRef.current) return

        candlesRef.current = candles
        oldestDateRef.current = new Date(candles[0].time * 1000)

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
          upColor: "#2d6a4f", downColor: "#b53333",
          borderUpColor: "#2d6a4f", borderDownColor: "#b53333",
          wickUpColor: "#2d6a4f", wickDownColor: "#b53333",
        })
        candleSeries.setData(candles)
        seriesRef.current.candle = candleSeries

        // Volume
        const volSeries = chart.addSeries(HistogramSeries, {
          color: "#e8e6dc",
          priceFormat: { type: "volume" },
          priceScaleId: "vol",
        })
        chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
        volSeries.setData(candles.map(c => ({
          time: c.time, value: c.volume,
          color: c.close >= c.open ? "#2d6a4f30" : "#b5333330",
        })))
        seriesRef.current.vol = volSeries

        // MAs
        updateMASeries(candles, visibleMAsRef.current)

        chart.timeScale().fitContent()
        setStatus("ok")

        // Subscribe to visible range → load more when near left edge
        chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
          if (!range) return
          if (range.from <= 10 && !isLoadingMoreRef.current && hasMoreRef.current) {
            loadMore()
          }
        })

        const onResize = () => {
          if (containerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
          }
        }
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
      } catch {
        if (!cancelled) setStatus("error")
      }
    }

    run()
    return () => {
      cancelled = true
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }
    }
  }, [symbol, timeframe, interval, height, loadMore, updateMASeries])

  // MA toggle
  useEffect(() => {
    visibleMAsRef.current = visibleMAs
    updateMASeries(candlesRef.current, visibleMAs)
  }, [visibleMAs, updateMASeries])

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0eee6]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#87867f] uppercase tracking-wide">
            {symbol} · {timeframe === "1W" ? "주봉" : "일봉"}
          </span>
          {isLoadingMore && (
            <span className="text-[10px] text-[#b0aea5] animate-pulse">과거 데이터 로딩 중...</span>
          )}
        </div>
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
