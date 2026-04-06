"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import {
  TrendingUp,
  Download,
  Share2,
  Maximize2,
  Settings,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"

interface ChartData {
  symbol: string
  price: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  change: number
  changePercent: number
  timestamp: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const timeframes = [
  { id: "1m", label: "1분" },
  { id: "5m", label: "5분" },
  { id: "15m", label: "15분" },
  { id: "1h", label: "1시간" },
  { id: "4h", label: "4시간" },
  { id: "1d", label: "일봉" },
  { id: "1w", label: "주봉" },
  { id: "1M", label: "월봉" },
]

const indicators = [
  "SMA",
  "EMA",
  "RSI",
  "MACD",
  "Bollinger Bands",
  "ATR",
  "Stochastic",
  "Volume",
]

export default function ChartsPage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()

  const [symbol, setSymbol] = useState("AAPL")
  const [selectedTimeframe, setSelectedTimeframe] = useState("1d")
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([
    "SMA",
    "RSI",
  ])
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    loadChartData()
  }, [symbol, selectedTimeframe])

  const loadChartData = async () => {
    try {
      setLoading(true)

      const response = await fetch(
        `${API_BASE}/api/charts/candles/${symbol}?timeframe=${selectedTimeframe}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error("Failed to load chart data")

      const data = await response.json()
      setChartData(data.data)
    } catch (err) {
      showError("차트 데이터를 로드할 수 없습니다")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleIndicator = (indicator: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(indicator)
        ? prev.filter((i) => i !== indicator)
        : [...prev, indicator]
    )
  }

  const handleDownloadChart = () => {
    success("차트가 다운로드되었습니다")
  }

  const handleShareChart = () => {
    success("공유 링크가 생성되었습니다")
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">고급 차트</h1>
            <p className="text-muted-foreground">
              기술적 지표를 활용한 심화 분석
            </p>
          </div>
        </AnimateIn>

        {/* 컨트롤 바 */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  placeholder="종목 심볼 (예: AAPL)"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="px-4 py-2 bg-muted border border-border rounded-lg text-foreground flex-1 max-w-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadChart}
                  className="p-2 hover:bg-muted rounded-lg transition-all"
                  title="다운로드"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={handleShareChart}
                  className="p-2 hover:bg-muted rounded-lg transition-all"
                  title="공유"
                >
                  <Share2 size={18} />
                </button>
                <button
                  className="p-2 hover:bg-muted rounded-lg transition-all"
                  title="확대"
                >
                  <Maximize2 size={18} />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-all ${
                    showSettings ? "bg-blue-600/20 text-blue-600" : "hover:bg-muted"
                  }`}
                  title="설정"
                >
                  <Settings size={18} />
                </button>
              </div>
            </div>

            {/* 타임프레임 선택 */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {timeframes.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSelectedTimeframe(id)}
                  className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    selectedTimeframe === id
                      ? "bg-blue-600 text-white"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 지표 설정 */}
            {showSettings && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm font-semibold mb-3">기술적 지표</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {indicators.map((indicator) => (
                    <label
                      key={indicator}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIndicators.includes(indicator)}
                        onChange={() => toggleIndicator(indicator)}
                        className="rounded"
                      />
                      <span className="text-sm">{indicator}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AnimateIn>

        {/* 차트 영역 */}
        <AnimateIn from="bottom" delay={160}>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 min-h-[500px] flex flex-col">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">로딩 중...</p>
                </div>
              ) : chartData ? (
                <>
                  {/* 차트 헤더 */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-2xl font-bold">{chartData.symbol}</h3>
                        <p className="text-muted-foreground">
                          {chartData.timestamp}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold">
                          ${chartData.price.toFixed(2)}
                        </p>
                        <p
                          className={`text-lg font-semibold ${
                            chartData.changePercent >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {chartData.changePercent >= 0 ? "+" : ""}
                          {chartData.changePercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 차트 플레이스홀더 */}
                  <div className="flex-1 bg-muted rounded-lg p-4 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <TrendingUp
                        className="mx-auto mb-2 opacity-50"
                        size={48}
                      />
                      <p>Lightweight Charts 라이브러리로 렌더링됩니다</p>
                      <p className="text-xs mt-2">
                        지표: {selectedIndicators.join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* 차트 정보 */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">시가</p>
                      <p className="text-lg font-bold">
                        ${chartData.open.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">고가</p>
                      <p className="text-lg font-bold text-green-600">
                        ${chartData.high.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">저가</p>
                      <p className="text-lg font-bold text-red-600">
                        ${chartData.low.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">종가</p>
                      <p className="text-lg font-bold">
                        ${chartData.close.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">거래량</p>
                      <p className="text-lg font-bold">
                        {(chartData.volume / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">
                    차트 데이터를 로드할 수 없습니다
                  </p>
                </div>
              )}
            </div>
          </div>
        </AnimateIn>

        {/* 선택된 지표 정보 */}
        {selectedIndicators.length > 0 && (
          <AnimateIn from="bottom" delay={240}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {selectedIndicators.map((indicator) => (
                <div
                  key={indicator}
                  className="bg-card border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold">{indicator}</h4>
                    <button
                      onClick={() => toggleIndicator(indicator)}
                      className="p-1 hover:bg-muted rounded transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>값: -</p>
                    <p className="text-xs mt-1">
                      기술적 분석 데이터 표시
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </AnimateIn>
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
