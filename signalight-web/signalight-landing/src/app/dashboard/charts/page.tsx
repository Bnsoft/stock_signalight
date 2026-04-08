"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { RefreshCw, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"

interface Candle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Indicators {
  current_price?: number
  rsi_14?: number
  macd?: number
  macd_signal?: number
  bollinger_upper?: number
  bollinger_lower?: number
  ma_20?: number
  ma_50?: number
  [key: string]: number | undefined
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const TIMEFRAMES = [
  { id: "1m",  label: "1분",  period: "1d"  },
  { id: "5m",  label: "5분",  period: "5d"  },
  { id: "15m", label: "15분", period: "5d"  },
  { id: "1h",  label: "1시간", period: "1mo" },
  { id: "1d",  label: "일봉",  period: "6mo" },
  { id: "1wk", label: "주봉",  period: "2y"  },
  { id: "1mo", label: "월봉",  period: "5y"  },
]

export default function ChartsPage() {
  const searchParams = useSearchParams()
  const { toasts, removeToast, error: showError } = useToast()

  const [symbol, setSymbol] = useState(searchParams.get("symbol") || "AAPL")
  const [inputSymbol, setInputSymbol] = useState(searchParams.get("symbol") || "AAPL")
  const [timeframe, setTimeframe] = useState("1d")
  const [candles, setCandles] = useState<Candle[]>([])
  const [indicators, setIndicators] = useState<Indicators>({})
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<any>(null)

  const tf = TIMEFRAMES.find((t) => t.id === timeframe) || TIMEFRAMES[4]

  const loadChart = useCallback(async (sym: string, tf_id: string) => {
    setLoading(true)
    try {
      const t = TIMEFRAMES.find((t) => t.id === tf_id) || TIMEFRAMES[4]
      const [chartRes, quoteRes] = await Promise.all([
        fetch(`${API_BASE}/api/chart/${sym}?interval=${tf_id}&period=${t.period}`),
        fetch(`${API_BASE}/api/quote/${sym}`),
      ])

      if (!chartRes.ok) throw new Error("차트 데이터 없음")

      const chartData = await chartRes.json()
      setCandles(chartData.candles || [])

      if (quoteRes.ok) {
        const quoteData = await quoteRes.json()
        setIndicators(quoteData.indicators || {})
      }

      setLastUpdate(new Date().toLocaleTimeString("ko-KR"))
    } catch (e: any) {
      showError(e.message || "데이터 로드 실패")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChart(symbol, timeframe)
  }, [symbol, timeframe, loadChart])

  // Render lightweight-charts candle chart
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return

    let chart: any = null

    const render = async () => {
      const { createChart, CandlestickSeries, HistogramSeries } = await import("lightweight-charts")

      // Destroy previous instance
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove()
        chartInstanceRef.current = null
      }

      const isDark = document.documentElement.classList.contains("dark")

      chart = createChart(chartRef.current!, {
        width: chartRef.current!.clientWidth,
        height: 420,
        layout: {
          background: { color: "transparent" },
          textColor: isDark ? "#e5e7eb" : "#1f2937",
        },
        grid: {
          vertLines: { color: isDark ? "#374151" : "#e5e7eb" },
          horzLines: { color: isDark ? "#374151" : "#e5e7eb" },
        },
        crosshair: { mode: 1 },
        timeScale: { borderColor: isDark ? "#4b5563" : "#d1d5db" },
      })

      chartInstanceRef.current = chart

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      })

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "#3b82f6",
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      })
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      })

      const candleData = candles.map((c) => ({
        time: c.timestamp.split("T")[0],
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))

      const volumeData = candles.map((c) => ({
        time: c.timestamp.split("T")[0],
        value: c.volume,
        color: c.close >= c.open ? "#22c55e44" : "#ef444444",
      }))

      candleSeries.setData(candleData)
      volumeSeries.setData(volumeData)
      chart.timeScale().fitContent()

      // Resize observer
      const ro = new ResizeObserver(() => {
        if (chartRef.current) {
          chart.applyOptions({ width: chartRef.current.clientWidth })
        }
      })
      ro.observe(chartRef.current!)
    }

    render()

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove()
        chartInstanceRef.current = null
      }
    }
  }, [candles])

  const handleSearch = () => {
    const sym = inputSymbol.trim().toUpperCase()
    if (sym) setSymbol(sym)
  }

  const latest = candles.length > 0 ? candles[candles.length - 1] : null
  const prev = candles.length > 1 ? candles[candles.length - 2] : null
  const change = latest && prev ? latest.close - prev.close : 0
  const changePct = prev ? (change / prev.close) * 100 : 0

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-1">차트 분석</h1>
            <p className="text-muted-foreground text-sm">yfinance 실제 데이터 · 15분 지연</p>
          </div>
        </AnimateIn>

        {/* 검색 & 타임프레임 */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                value={inputSymbol}
                onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="심볼 입력 (AAPL, SPY, QQQ...)"
                className="flex-1 max-w-xs px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
              />
              <button
                onClick={handleSearch}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
              >
                조회
              </button>
              <button
                onClick={() => loadChart(symbol, timeframe)}
                disabled={loading}
                className="p-2 hover:bg-muted rounded-lg"
                title="새로고침"
              >
                <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
              </button>
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">업데이트: {lastUpdate}</span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {TIMEFRAMES.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTimeframe(id)}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                    timeframe === id
                      ? "bg-blue-600 text-white"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </AnimateIn>

        {/* 가격 헤더 */}
        {latest && (
          <AnimateIn from="bottom" delay={120}>
            <div className="bg-card border border-border rounded-lg p-4 mb-4 flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">{symbol}</span>
                <span className="text-sm text-muted-foreground ml-2">{tf.label}</span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">${latest.close.toFixed(2)}</p>
                <p className={`text-sm font-semibold ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
                </p>
              </div>
              <div className="hidden md:grid grid-cols-4 gap-6 text-sm">
                {[
                  { label: "시가", value: `$${latest.open.toFixed(2)}` },
                  { label: "고가", value: `$${latest.high.toFixed(2)}`, color: "text-green-600" },
                  { label: "저가", value: `$${latest.low.toFixed(2)}`, color: "text-red-600" },
                  { label: "거래량", value: `${(latest.volume / 1_000_000).toFixed(1)}M` },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-muted-foreground">{label}</p>
                    <p className={`font-bold ${color || ""}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        )}

        {/* 캔들 차트 */}
        <AnimateIn from="bottom" delay={160}>
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            {loading ? (
              <div className="flex items-center justify-center h-[420px] text-muted-foreground">
                <div className="text-center">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  <p>데이터 로딩 중...</p>
                </div>
              </div>
            ) : candles.length === 0 ? (
              <div className="flex items-center justify-center h-[420px] text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="mx-auto mb-2 opacity-40" size={48} />
                  <p>데이터 없음</p>
                </div>
              </div>
            ) : (
              <div ref={chartRef} className="w-full" />
            )}
          </div>
        </AnimateIn>

        {/* 기술적 지표 */}
        {Object.keys(indicators).length > 0 && (
          <AnimateIn from="bottom" delay={240}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "rsi_14", label: "RSI (14)", format: (v: number) => v.toFixed(1),
                  color: (v: number) => v > 70 ? "text-red-600" : v < 30 ? "text-green-600" : "" },
                { key: "macd", label: "MACD", format: (v: number) => v.toFixed(3),
                  color: (v: number) => v >= 0 ? "text-green-600" : "text-red-600" },
                { key: "bollinger_upper", label: "BB 상단", format: (v: number) => `$${v.toFixed(2)}`, color: () => "" },
                { key: "bollinger_lower", label: "BB 하단", format: (v: number) => `$${v.toFixed(2)}`, color: () => "" },
                { key: "ma_20", label: "MA 20", format: (v: number) => `$${v.toFixed(2)}`, color: () => "" },
                { key: "ma_50", label: "MA 50", format: (v: number) => `$${v.toFixed(2)}`, color: () => "" },
              ].filter(({ key }) => indicators[key] !== undefined && indicators[key] !== null).map(({ key, label, format, color }) => {
                const val = indicators[key] as number
                return (
                  <div key={key} className="bg-card border border-border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color(val)}`}>{format(val)}</p>
                  </div>
                )
              })}
            </div>
          </AnimateIn>
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
