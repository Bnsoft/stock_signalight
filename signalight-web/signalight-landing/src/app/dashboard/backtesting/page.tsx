"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import {
  Play,
  TrendingUp,
  DollarSign,
  Percent,
  BarChart3,
  Copy,
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"

interface BacktestResult {
  strategy: string
  totalReturn: number
  winRate: number
  maxDrawdown: number
  sharpeRatio: number
  trades: number
  avgWin: number
  avgLoss: number
  symbol: string
  startDate: string
  endDate: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const strategies = [
  { id: "sma", label: "SMA 교차 전략" },
  { id: "rsi", label: "RSI 역추적 전략" },
  { id: "macd", label: "MACD 전략" },
  { id: "bollinger", label: "볼린저 밴드 전략" },
  { id: "momentum", label: "모멘텀 전략" },
  { id: "mean_reversion", label: "평균 회귀 전략" },
]

export default function BacktestingPage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()

  const [symbol, setSymbol] = useState("AAPL")
  const [selectedStrategy, setSelectedStrategy] = useState("sma")
  const [startDate, setStartDate] = useState("2023-01-01")
  const [endDate, setEndDate] = useState("2024-01-01")
  const [initialCapital, setInitialCapital] = useState("10000")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleRunBacktest = async () => {
    if (!symbol.trim()) {
      showError("종목 심볼을 입력하세요")
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`${API_BASE}/api/backtest/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          strategy: selectedStrategy,
          start_date: startDate,
          end_date: endDate,
          initial_capital: parseFloat(initialCapital),
        }),
      })

      if (!response.ok) throw new Error("Failed to run backtest")

      const data = await response.json()
      setResult(data.data)
      success("백테스트가 완료되었습니다")
    } catch (err) {
      showError("백테스트 실행에 실패했습니다")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = async () => {
    if (!symbol.trim()) {
      showError("종목 심볼을 입력하세요")
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`${API_BASE}/api/backtest/compare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          strategies: strategies.map((s) => s.id),
          start_date: startDate,
          end_date: endDate,
          initial_capital: parseFloat(initialCapital),
        }),
      })

      if (!response.ok) throw new Error("Failed to compare strategies")

      const data = await response.json()
      success("전략 비교가 완료되었습니다")
    } catch (err) {
      showError("전략 비교에 실패했습니다")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">백테스팅</h1>
            <p className="text-muted-foreground">
              과거 데이터로 거래 전략을 검증하세요
            </p>
          </div>
        </AnimateIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 백테스트 설정 */}
          <AnimateIn from="bottom" delay={80} className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-bold">백테스트 설정</h2>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  종목 심볼
                </label>
                <input
                  type="text"
                  placeholder="예: AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">전략</label>
                <select
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(e.target.value)}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                >
                  {strategies.map(({ id, label }) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  시작 날짜
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  종료 날짜
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  초기 자본
                </label>
                <input
                  type="number"
                  placeholder="10000"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                />
              </div>

              <button
                onClick={handleRunBacktest}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Play size={18} />
                {loading ? "실행 중..." : "백테스트 실행"}
              </button>

              <button
                onClick={handleCompare}
                disabled={loading}
                className="w-full px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-muted text-white font-bold rounded-lg transition-all"
              >
                <Copy size={16} className="inline mr-2" />
                전략 비교
              </button>

              {/* 고급 옵션 */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                {showAdvanced ? "고급 옵션 숨기기" : "고급 옵션"}
              </button>

              {showAdvanced && (
                <div className="border-t border-border pt-4 space-y-3 text-sm">
                  <p className="text-muted-foreground">고급 옵션 설정 (향후 추가)</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>수수료 설정</li>
                    <li>슬리피지 설정</li>
                    <li>포지션 크기</li>
                    <li>위험 관리</li>
                  </ul>
                </div>
              )}
            </div>
          </AnimateIn>

          {/* 결과 표시 */}
          <AnimateIn from="bottom" delay={160} className="lg:col-span-2">
            {result ? (
              <div className="space-y-4">
                {/* 결과 카드들 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-lg p-6">
                    <p className="text-sm text-muted-foreground mb-1">총 수익률</p>
                    <p
                      className={`text-3xl font-bold ${
                        result.totalReturn >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {result.totalReturn >= 0 ? "+" : ""}
                      {result.totalReturn.toFixed(2)}%
                    </p>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <p className="text-sm text-muted-foreground mb-1">최대낙폭</p>
                    <p className="text-3xl font-bold text-red-600">
                      {result.maxDrawdown.toFixed(2)}%
                    </p>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <p className="text-sm text-muted-foreground mb-1">
                      승률
                    </p>
                    <p className="text-3xl font-bold text-blue-600">
                      {result.winRate.toFixed(2)}%
                    </p>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <p className="text-sm text-muted-foreground mb-1">
                      샤프 지수
                    </p>
                    <p className="text-3xl font-bold text-purple-600">
                      {result.sharpeRatio.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">상세 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">거래 횟수</p>
                      <p className="text-xl font-bold">{result.trades}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">평균 수익</p>
                      <p className="text-xl font-bold text-green-600">
                        ${result.avgWin.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">평균 손실</p>
                      <p className="text-xl font-bold text-red-600">
                        -${result.avgLoss.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">손익비</p>
                      <p className="text-xl font-bold">
                        {(result.avgWin / result.avgLoss).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 기간 정보 */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">백테스트 기간</h3>
                  <div className="text-sm space-y-2">
                    <p>
                      <span className="text-muted-foreground">종목:</span>{" "}
                      <span className="font-semibold">{result.symbol}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">전략:</span>{" "}
                      <span className="font-semibold">{result.strategy}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">기간:</span>{" "}
                      <span className="font-semibold">
                        {result.startDate} ~ {result.endDate}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <BarChart3 className="mx-auto mb-4 text-muted-foreground" size={32} />
                <p className="text-muted-foreground">
                  백테스트를 실행하여 결과를 확인하세요
                </p>
              </div>
            )}
          </AnimateIn>
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
