"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Play, BarChart3, TrendingUp, Zap, BarChart2, Clock } from "lucide-react"

interface BacktestResult {
  strategy_name: string
  symbol: string
  period: string
  initial_capital: number
  final_value: number
  total_return_percent: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate: number
  avg_win: number
  avg_loss: number
  profit_factor: number
  max_drawdown_percent: number
  sharpe_ratio: number
  sortino_ratio: number
  status: string
}

interface StrategyComparison {
  strategy: string
  total_return: number
  win_rate: number
  max_drawdown: number
  sharpe_ratio: number
}

interface MonteCarloResult {
  strategy_name: string
  symbol: string
  num_simulations: number
  mean_return: number
  median_return: number
  best_case_return: number
  worst_case_return: number
  var_95: number
  probability_positive: number
  confidence_interval_95: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

type BacktestTab = "run" | "results" | "compare" | "monte-carlo" | "optimize" | "portfolio" | "history"

export default function BacktestingPage() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<BacktestTab>("run")
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<BacktestResult | null>(null)
  const [comparison, setComparison] = useState<StrategyComparison[] | null>(null)
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(null)
  const [history, setHistory] = useState<BacktestResult[]>([])

  // Form states
  const [formData, setFormData] = useState({
    strategy: "Golden Cross",
    symbol: "SPY",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    initialCapital: 100000,
  })

  const [compareStrategies, setCompareStrategies] = useState({
    symbol: "SPY",
    strategies: ["Golden Cross", "RSI Oversold", "MACD Cross"],
  })

  const [monteCarloConfig, setMonteCarloConfig] = useState({
    strategy: "Golden Cross",
    symbol: "SPY",
    simulations: 1000,
  })

  const [optimizeConfig, setOptimizeConfig] = useState({
    strategy: "Golden Cross",
    symbol: "SPY",
  })

  useEffect(() => {
    if (!token) return
    if (activeTab === "history") {
      fetchBacktestHistory()
    }
  }, [activeTab, token])

  const fetchBacktestHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/backtest/results?symbol=${formData.symbol}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch (err) {
      console.error("Failed to fetch backtest history:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleRunBacktest = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/backtest/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          strategy_name: formData.strategy,
          symbol: formData.symbol,
          start_date: formData.startDate,
          end_date: formData.endDate,
          initial_capital: formData.initialCapital,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setLastResult(data)
        setActiveTab("results")
      }
    } catch (err) {
      console.error("Failed to run backtest:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCompareStrategies = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/backtest/compare`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: compareStrategies.symbol,
          strategies: compareStrategies.strategies,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setComparison(data.comparison)
        setActiveTab("compare")
      }
    } catch (err) {
      console.error("Failed to compare strategies:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleMonteCarloSimulation = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/backtest/monte-carlo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          strategy_name: monteCarloConfig.strategy,
          symbol: monteCarloConfig.symbol,
          num_simulations: monteCarloConfig.simulations,
          historical_trades: [],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMonteCarloResult(data)
        setActiveTab("monte-carlo")
      }
    } catch (err) {
      console.error("Failed to run Monte Carlo simulation:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOptimizeParameters = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/backtest/optimize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          strategy_name: optimizeConfig.strategy,
          symbol: optimizeConfig.symbol,
          param_ranges: {
            sma_short: [10, 20, 30],
            sma_long: [50, 100, 200],
            rsi_threshold: [30, 35, 40],
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setLastResult(data)
        setActiveTab("optimize")
      }
    } catch (err) {
      console.error("Failed to optimize parameters:", err)
    } finally {
      setLoading(false)
    }
  }

  const TabButton = ({ tab, label, icon: Icon }: { tab: BacktestTab; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        activeTab === tab
          ? "bg-blue-600 text-white"
          : "bg-muted text-foreground hover:bg-muted/80"
      }`}
    >
      <Icon size={18} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">백테스팅</h1>
            <p className="text-muted-foreground">
              전략의 과거 성과를 분석하고 최적화하세요
            </p>
          </div>
        </AnimateIn>

        {/* Tab Navigation */}
        <AnimateIn from="bottom" delay={80}>
          <div className="mb-8 bg-card border border-border rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              <TabButton tab="run" label="백테스트 실행" icon={Play} />
              <TabButton tab="results" label="결과 분석" icon={BarChart3} />
              <TabButton tab="compare" label="전략 비교" icon={TrendingUp} />
              <TabButton tab="monte-carlo" label="몬테카를로" icon={Zap} />
              <TabButton tab="optimize" label="파라미터 최적화" icon={BarChart2} />
              <TabButton tab="portfolio" label="포트폴리오" icon={TrendingUp} />
              <TabButton tab="history" label="이력" icon={Clock} />
            </div>
          </div>
        </AnimateIn>

        {/* Content Area */}
        <AnimateIn from="bottom" delay={160}>
          <div>
            {loading ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center animate-pulse">
                <p className="text-muted-foreground">처리 중...</p>
              </div>
            ) : activeTab === "run" ? (
              <RunBacktestForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleRunBacktest}
                loading={loading}
              />
            ) : activeTab === "results" && lastResult ? (
              <BacktestResultsView result={lastResult} />
            ) : activeTab === "compare" ? (
              <CompareStrategiesForm
                config={compareStrategies}
                setConfig={setCompareStrategies}
                onSubmit={handleCompareStrategies}
                loading={loading}
                results={comparison}
              />
            ) : activeTab === "monte-carlo" ? (
              <MonteCarloForm
                config={monteCarloConfig}
                setConfig={setMonteCarloConfig}
                onSubmit={handleMonteCarloSimulation}
                loading={loading}
                result={monteCarloResult}
              />
            ) : activeTab === "optimize" ? (
              <OptimizeParametersForm
                config={optimizeConfig}
                setConfig={setOptimizeConfig}
                onSubmit={handleOptimizeParameters}
                loading={loading}
                result={lastResult}
              />
            ) : activeTab === "portfolio" ? (
              <PortfolioBacktestSection />
            ) : activeTab === "history" ? (
              <BacktestHistoryView history={history} />
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">이 섹션을 보려면 먼저 작업을 실행하세요</p>
              </div>
            )}
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}

function RunBacktestForm({ formData, setFormData, onSubmit, loading }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold mb-2">전략</label>
          <select
            value={formData.strategy}
            onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          >
            <option>Golden Cross</option>
            <option>RSI Oversold</option>
            <option>MACD Cross</option>
            <option>Bollinger Bands</option>
            <option>Moving Average</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">종목</label>
          <input
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
            placeholder="예: SPY"
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">시작일</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">종료일</label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-2">초기 자본</label>
          <input
            type="number"
            value={formData.initialCapital}
            onChange={(e) => setFormData({ ...formData, initialCapital: parseFloat(e.target.value) })}
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
          />
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all"
      >
        {loading ? "실행 중..." : "백테스트 실행"}
      </button>
    </div>
  )
}

function BacktestResultsView({ result }: { result: BacktestResult }) {
  if (!result) return null

  const metricsGrid = [
    { label: "초기 자본", value: `$${result.initial_capital.toLocaleString()}` },
    { label: "최종 값", value: `$${result.final_value.toLocaleString()}`, color: "text-green-600" },
    { label: "총 수익률", value: `${result.total_return_percent.toFixed(2)}%`, color: "text-green-600" },
    { label: "총 거래", value: `${result.total_trades}` },
    { label: "수익 거래", value: `${result.winning_trades}`, color: "text-green-600" },
    { label: "손실 거래", value: `${result.losing_trades}`, color: "text-red-600" },
    { label: "승률", value: `${result.win_rate.toFixed(2)}%` },
    { label: "평균 수익", value: `$${result.avg_win.toFixed(2)}`, color: "text-green-600" },
    { label: "평균 손실", value: `$${result.avg_loss.toFixed(2)}`, color: "text-red-600" },
    { label: "수익 지수", value: `${result.profit_factor.toFixed(2)}` },
    { label: "최대 손실률", value: `${result.max_drawdown_percent.toFixed(2)}%`, color: "text-orange-600" },
    { label: "Sharpe Ratio", value: `${result.sharpe_ratio.toFixed(2)}` },
    { label: "Sortino Ratio", value: `${result.sortino_ratio.toFixed(2)}` },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">{result.strategy_name} - {result.symbol}</h2>
        <p className="text-muted-foreground mb-6">{result.period}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {metricsGrid.map((metric, idx) => (
            <div key={idx} className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
              <p className={`text-lg font-bold ${metric.color || "text-foreground"}`}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Statistics */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">거래 통계</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-muted-foreground">기대값</span>
            <span className="font-semibold">
              ${((result.avg_win * result.winning_trades - Math.abs(result.avg_loss) * result.losing_trades) / result.total_trades).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">수익 거래 비율</span>
            <span className="font-semibold text-green-600">{((result.winning_trades / result.total_trades) * 100).toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">손실 거래 비율</span>
            <span className="font-semibold text-red-600">{((result.losing_trades / result.total_trades) * 100).toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompareStrategiesForm({ config, setConfig, onSubmit, loading, results }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">전략 비교</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">종목</label>
            <input
              type="text"
              value={config.symbol}
              onChange={(e) => setConfig({ ...config, symbol: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">비교할 전략 (쉼표로 구분)</label>
            <textarea
              value={config.strategies.join(", ")}
              onChange={(e) => setConfig({ ...config, strategies: e.target.value.split(",").map(s => s.trim()) })}
              rows={3}
              className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
              placeholder="Golden Cross, RSI Oversold, MACD Cross"
            />
          </div>

          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg"
          >
            {loading ? "비교 중..." : "전략 비교"}
          </button>
        </div>
      </div>

      {results && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold">전략</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">수익률</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">승률</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">최대 손실률</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Sharpe</th>
                </tr>
              </thead>
              <tbody>
                {results.map((strategy: StrategyComparison, idx: number) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50">
                    <td className="px-6 py-3 text-sm font-bold">{strategy.strategy}</td>
                    <td className={`px-6 py-3 text-right text-sm font-semibold ${strategy.total_return >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {strategy.total_return >= 0 ? "+" : ""}{strategy.total_return.toFixed(2)}%
                    </td>
                    <td className="px-6 py-3 text-right text-sm">{strategy.win_rate.toFixed(2)}%</td>
                    <td className="px-6 py-3 text-right text-sm text-red-600">{strategy.max_drawdown.toFixed(2)}%</td>
                    <td className="px-6 py-3 text-right text-sm">{strategy.sharpe_ratio.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function MonteCarloForm({ config, setConfig, onSubmit, loading, result }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">몬테카를로 시뮬레이션</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">전략</label>
              <input
                type="text"
                value={config.strategy}
                onChange={(e) => setConfig({ ...config, strategy: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">종목</label>
              <input
                type="text"
                value={config.symbol}
                onChange={(e) => setConfig({ ...config, symbol: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">시뮬레이션 수</label>
              <input
                type="number"
                value={config.simulations}
                onChange={(e) => setConfig({ ...config, simulations: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg"
          >
            {loading ? "시뮬레이션 중..." : "시뮬레이션 실행"}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">평균 수익률</p>
              <p className="text-lg font-bold text-green-600">{result.mean_return.toFixed(2)}%</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">중앙값 수익률</p>
              <p className="text-lg font-bold">{result.median_return.toFixed(2)}%</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">최선의 경우</p>
              <p className="text-lg font-bold text-green-600">{result.best_case_return.toFixed(2)}%</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">최악의 경우</p>
              <p className="text-lg font-bold text-red-600">{result.worst_case_return.toFixed(2)}%</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">VaR (95%)</p>
              <p className="text-lg font-bold text-orange-600">{result.var_95.toFixed(2)}%</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">양의 수익 확률</p>
              <p className="text-lg font-bold text-green-600">{result.probability_positive.toFixed(2)}%</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm font-semibold mb-2">95% 신뢰도 구간</p>
            <p className="text-lg font-bold text-blue-600">{result.confidence_interval_95}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function OptimizeParametersForm({ config, setConfig, onSubmit, loading, result }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">파라미터 최적화</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">전략</label>
              <input
                type="text"
                value={config.strategy}
                onChange={(e) => setConfig({ ...config, strategy: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">종목</label>
              <input
                type="text"
                value={config.symbol}
                onChange={(e) => setConfig({ ...config, symbol: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            테스트 범위: SMA Short (10-30), SMA Long (50-200), RSI Threshold (30-40)
          </p>

          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg"
          >
            {loading ? "최적화 중..." : "최적화 시작"}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold">최적 파라미터</h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">SMA Short</p>
              <p className="text-lg font-bold">{result.optimal_parameters?.sma_short || "N/A"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">SMA Long</p>
              <p className="text-lg font-bold">{result.optimal_parameters?.sma_long || "N/A"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">RSI Threshold</p>
              <p className="text-lg font-bold">{result.optimal_parameters?.rsi_threshold || "N/A"}</p>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">최고 수익률</span>
              <span className="font-bold text-green-600">{result.best_return_percent?.toFixed(2) || "N/A"}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">예상 승률</span>
              <span className="font-bold">{result.win_rate?.toFixed(2) || "N/A"}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">총 거래 수</span>
              <span className="font-bold">{result.total_trades || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-muted-foreground">권고</span>
              <span className="font-semibold text-blue-600">{result.recommendation || "N/A"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PortfolioBacktestSection() {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">포트폴리오 백테스트</h2>
      <p className="text-muted-foreground">
        여러 종목의 가중치를 설정하여 포트폴리오의 과거 성과를 분석합니다.
      </p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">종목과 가중치 (심볼: 가중치%)</label>
          <textarea
            rows={4}
            placeholder="SPY: 60%&#10;QQQ: 30%&#10;BND: 10%"
            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground"
          />
        </div>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">
          포트폴리오 백테스트 실행
        </button>
      </div>
    </div>
  )
}

function BacktestHistoryView({ history }: { history: BacktestResult[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">백테스트 이력이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left text-sm font-semibold">전략</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">종목</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">수익률</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">승률</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">최대 손실률</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">백테스트 일자</th>
            </tr>
          </thead>
          <tbody>
            {history.map((result, idx) => (
              <tr key={idx} className="border-b border-border hover:bg-muted/50">
                <td className="px-6 py-3 text-sm font-bold">{result.strategy_name}</td>
                <td className="px-6 py-3 text-sm">{result.symbol}</td>
                <td className={`px-6 py-3 text-right text-sm font-semibold ${result.total_return_percent >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {result.total_return_percent >= 0 ? "+" : ""}{result.total_return_percent.toFixed(2)}%
                </td>
                <td className="px-6 py-3 text-right text-sm">{result.win_rate.toFixed(2)}%</td>
                <td className="px-6 py-3 text-right text-sm text-red-600">{result.max_drawdown_percent.toFixed(2)}%</td>
                <td className="px-6 py-3 text-right text-sm text-muted-foreground">
                  {new Date(result.period).toLocaleDateString("ko-KR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
