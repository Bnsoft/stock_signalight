"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { usePriceUpdate, useIndicators } from "@/hooks/useRealtimeData"
import { TrendingUp, Plus, Minus, Save, Download } from "lucide-react"

interface ChartIndicator {
  type: "SMA" | "EMA" | "RSI" | "MACD" | "BOLLINGER" | "ATR"
  enabled: boolean
  params?: {
    period?: number
    color?: string
  }
}

interface ChartData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w" | "1m_monthly"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function ChartsPage() {
  const { user, token } = useAuth()
  const [symbol, setSymbol] = useState("SPY")
  const [timeframe, setTimeframe] = useState<Timeframe>("1d")
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [indicators, setIndicators] = useState<Record<string, ChartIndicator>>({
    sma20: { type: "SMA", enabled: true, params: { period: 20 } },
    sma50: { type: "SMA", enabled: false, params: { period: 50 } },
    sma200: { type: "SMA", enabled: false, params: { period: 200 } },
    rsi: { type: "RSI", enabled: false },
    macd: { type: "MACD", enabled: false },
    bollinger: { type: "BOLLINGER", enabled: false },
  })
  const [compareSymbols, setCompareSymbols] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const priceData = usePriceUpdate(symbol)
  const indicatorData = useIndicators(symbol)
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchChartData()
  }, [symbol, timeframe])

  const fetchChartData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/charts/candles/${symbol}?timeframe=${timeframe}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setChartData(data.candles || [])
      }
    } catch (err) {
      console.error("Failed to fetch chart data:", err)
    } finally {
      setLoading(false)
    }
  }

  const toggleIndicator = (key: string) => {
    setIndicators((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
      },
    }))
  }

  const addCompareSymbol = (sym: string) => {
    if (sym && sym !== symbol && !compareSymbols.includes(sym)) {
      setCompareSymbols([...compareSymbols, sym])
    }
  }

  const removeCompareSymbol = (sym: string) => {
    setCompareSymbols(compareSymbols.filter((s) => s !== sym))
  }

  const handleSaveChart = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/charts/save`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.user_id,
          symbol,
          timeframe,
          indicators: Object.entries(indicators)
            .filter(([, ind]) => ind.enabled)
            .map(([key, ind]) => ({ key, ...ind })),
        }),
      })

      if (res.ok) {
        alert("차트가 저장되었습니다")
      }
    } catch (err) {
      console.error("Failed to save chart:", err)
    }
  }

  const timeframes: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">고급 차트 분석</h1>
            <p className="text-muted-foreground">
              실시간 가격 및 기술적 지표 분석
            </p>
          </div>
        </AnimateIn>

        {/* Controls */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2">종목</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="SPY"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">타임프레임</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                >
                  {timeframes.map((tf) => (
                    <option key={tf} value={tf}>
                      {tf.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-end gap-2">
                <button
                  onClick={handleSaveChart}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
                >
                  <Save size={16} />
                  차트 저장
                </button>
                <button className="flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg transition-all">
                  <Download size={16} />
                  내보내기
                </button>
              </div>
            </div>

            {/* Price Info */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">현재가</p>
                <p className="text-lg font-bold text-blue-600">${priceData.price?.toFixed(2) || "N/A"}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">변동률</p>
                <p className={`text-lg font-bold ${(priceData.changePercent || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {(priceData.changePercent || 0) >= 0 ? "+" : ""}{priceData.changePercent?.toFixed(2) || "0.00"}%
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">Bid</p>
                <p className="text-lg font-bold">${priceData.bid?.toFixed(2) || "N/A"}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">Ask</p>
                <p className="text-lg font-bold">${priceData.ask?.toFixed(2) || "N/A"}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">거래량</p>
                <p className="text-lg font-bold">{(priceData.volume || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Main Chart Area */}
        <AnimateIn from="bottom" delay={160}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chart Container */}
            <div className="lg:col-span-3 bg-card border border-border rounded-lg p-4">
              <div ref={chartContainerRef} className="h-96 bg-muted/50 rounded-lg flex items-center justify-center border border-border mb-4">
                {loading ? (
                  <p className="text-muted-foreground animate-pulse">차트 로딩 중...</p>
                ) : (
                  <ChartVisualization chartData={chartData} symbol={symbol} timeframe={timeframe} />
                )}
              </div>

              {/* Volume Chart */}
              <div className="h-24 bg-muted/50 rounded-lg flex items-center justify-center border border-border text-muted-foreground">
                거래량 차트
              </div>
            </div>

            {/* Sidebar - Indicators & Settings */}
            <div className="space-y-4">
              {/* Indicators */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-bold mb-3">기술적 지표</h3>
                <div className="space-y-2">
                  {Object.entries(indicators).map(([key, indicator]) => (
                    <button
                      key={key}
                      onClick={() => toggleIndicator(key)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                        indicator.enabled
                          ? "bg-blue-600/20 border border-blue-600 text-blue-600"
                          : "bg-muted border border-border text-foreground hover:bg-muted/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{indicator.type}</span>
                        {indicator.params?.period && (
                          <span className="text-xs text-muted-foreground">{indicator.params.period}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Indicator Values */}
              {indicatorData.timestamp && (
                <div className="bg-card border border-border rounded-lg p-4 text-sm space-y-2">
                  <h3 className="font-bold mb-3">지표값</h3>
                  {indicatorData.rsi && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RSI</span>
                      <span className="font-semibold">{indicatorData.rsi.toFixed(2)}</span>
                    </div>
                  )}
                  {indicatorData.sma20 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SMA20</span>
                      <span className="font-semibold">${indicatorData.sma20.toFixed(2)}</span>
                    </div>
                  )}
                  {indicatorData.sma50 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SMA50</span>
                      <span className="font-semibold">${indicatorData.sma50.toFixed(2)}</span>
                    </div>
                  )}
                  {indicatorData.sma200 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SMA200</span>
                      <span className="font-semibold">${indicatorData.sma200.toFixed(2)}</span>
                    </div>
                  )}
                  {indicatorData.macd && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MACD</span>
                      <span className="font-semibold">{indicatorData.macd.toFixed(3)}</span>
                    </div>
                  )}
                  {indicatorData.bollingerUpper && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">BBUpper</span>
                        <span className="font-semibold">${indicatorData.bollingerUpper.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">BBMiddle</span>
                        <span className="font-semibold">${indicatorData.bollingerMiddle.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">BBLower</span>
                        <span className="font-semibold">${indicatorData.bollingerLower.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Compare Symbols */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-bold mb-3">비교 종목</h3>
                <div className="space-y-2 mb-3">
                  {compareSymbols.map((sym) => (
                    <div
                      key={sym}
                      className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg border border-border"
                    >
                      <span className="font-medium">{sym}</span>
                      <button
                        onClick={() => removeCompareSymbol(sym)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="종목 추가"
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground text-sm"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addCompareSymbol((e.target as HTMLInputElement).value.toUpperCase())
                        ;(e.target as HTMLInputElement).value = ""
                      }
                    }}
                  />
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}

function ChartVisualization({ chartData, symbol, timeframe }: { chartData: ChartData[]; symbol: string; timeframe: string }) {
  if (!chartData || chartData.length === 0) {
    return <p className="text-muted-foreground">차트 데이터 없음</p>
  }

  // Simple candlestick visualization
  const minPrice = Math.min(...chartData.map((d) => d.low))
  const maxPrice = Math.max(...chartData.map((d) => d.high))
  const range = maxPrice - minPrice

  return (
    <div className="w-full h-full relative">
      <svg viewBox={`0 0 ${chartData.length * 5} 100`} className="w-full h-full" preserveAspectRatio="none">
        {chartData.map((candle, idx) => {
          const x = idx * 5 + 2.5
          const yHigh = 100 - ((candle.high - minPrice) / range) * 80 - 10
          const yLow = 100 - ((candle.low - minPrice) / range) * 80 - 10
          const yOpen = 100 - ((candle.open - minPrice) / range) * 80 - 10
          const yClose = 100 - ((candle.close - minPrice) / range) * 80 - 10

          const isUp = candle.close >= candle.open
          const color = isUp ? "#10b981" : "#ef4444"

          const bodyTop = Math.min(yOpen, yClose)
          const bodyHeight = Math.abs(yClose - yOpen) || 1

          return (
            <g key={idx}>
              {/* Wick */}
              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="0.3" />
              {/* Body */}
              <rect x={x - 1.5} y={bodyTop} width="3" height={bodyHeight} fill={color} />
            </g>
          )
        })}
      </svg>
      <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs text-muted-foreground">
        <span>${minPrice.toFixed(2)}</span>
        <span>{symbol} - {timeframe.toUpperCase()}</span>
        <span>${maxPrice.toFixed(2)}</span>
      </div>
    </div>
  )
}
