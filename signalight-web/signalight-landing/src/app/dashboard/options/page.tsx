"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { TrendingUp, TrendingDown, Settings2, BarChart3 } from "lucide-react"

interface OptionChain {
  symbol: string
  current_price: number
  expiration_date: string
  days_to_expiration: number
  calls: OptionData[]
  puts: OptionData[]
  atm_strike: number
}

interface OptionData {
  strike: number
  bid: number
  ask: number
  last_price: number
  volume: number
  open_interest: number
  implied_volatility: number
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
}

interface Strategy {
  name: string
  description: string
  risk: string
  reward: string
  break_even: string
  best_when: string
}

type OptionsTab = "chain" | "strategies" | "calculator" | "analysis" | "positions"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function OptionsPage() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<OptionsTab>("chain")
  const [symbol, setSymbol] = useState("SPY")
  const [expirations, setExpirations] = useState<string[]>([])
  const [selectedExpiration, setSelectedExpiration] = useState("2024-05-17")
  const [optionsChain, setOptionsChain] = useState<OptionChain | null>(null)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(false)
  const [showCalls, setShowCalls] = useState(true)
  const [showPuts, setShowPuts] = useState(true)

  // Calculator states
  const [calcInput, setCalcInput] = useState({
    currentPrice: 450,
    strikePrice: 450,
    daysToExp: 30,
    volatility: 25,
    interestRate: 5,
    optionType: "CALL" as "CALL" | "PUT",
  })

  const [calcResults, setCalcResults] = useState<any>(null)

  useEffect(() => {
    if (!token) return
    fetchOptionsChain()
    fetchStrategies()
  }, [token, symbol, selectedExpiration])

  const fetchOptionsChain = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/options/chain/${symbol}?expiration=${selectedExpiration}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (res.ok) {
        const data = await res.json()
        setOptionsChain(data)

        // Extract unique expirations
        if (!expirations.includes(selectedExpiration)) {
          setExpirations([...expirations, selectedExpiration])
        }
      }
    } catch (err) {
      console.error("Failed to fetch options chain:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStrategies = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/options/strategies`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setStrategies(data.strategies || [])
      }
    } catch (err) {
      console.error("Failed to fetch strategies:", err)
    }
  }

  const handleCalculate = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/options/greeks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
          strike_price: calcInput.strikePrice,
          current_price: calcInput.currentPrice,
          days_to_expiration: calcInput.daysToExp,
          implied_volatility: calcInput.volatility / 100,
          risk_free_rate: calcInput.interestRate / 100,
          option_type: calcInput.optionType,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setCalcResults(data)
      }
    } catch (err) {
      console.error("Failed to calculate greeks:", err)
    }
  }

  const TabButton = ({ tab, label, icon: Icon }: { tab: OptionsTab; label: string; icon: any }) => (
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
            <h1 className="text-3xl font-bold mb-2">옵션 분석</h1>
            <p className="text-muted-foreground">
              옵션 체인, 그릭스, 전략 분석
            </p>
          </div>
        </AnimateIn>

        {/* Controls */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">종목</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="SPY"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">만료 기한</label>
                <select
                  value={selectedExpiration}
                  onChange={(e) => setSelectedExpiration(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
                >
                  <option value="2024-05-17">2024-05-17 (30일)</option>
                  <option value="2024-06-21">2024-06-21 (65일)</option>
                  <option value="2024-09-20">2024-09-20 (155일)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchOptionsChain}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-all"
                >
                  {loading ? "로딩 중..." : "조회"}
                </button>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Tab Navigation */}
        <AnimateIn from="bottom" delay={160}>
          <div className="mb-8 bg-card border border-border rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              <TabButton tab="chain" label="옵션 체인" icon={BarChart3} />
              <TabButton tab="strategies" label="전략" icon={TrendingUp} />
              <TabButton tab="calculator" label="계산기" icon={Settings2} />
              <TabButton tab="analysis" label="분석" icon={BarChart3} />
              <TabButton tab="positions" label="포지션" icon={TrendingDown} />
            </div>
          </div>
        </AnimateIn>

        {/* Content Area */}
        <AnimateIn from="bottom" delay={240}>
          <div>
            {activeTab === "chain" && (
              <OptionsChainView
                optionsChain={optionsChain}
                showCalls={showCalls}
                setShowCalls={setShowCalls}
                showPuts={showPuts}
                setShowPuts={setShowPuts}
                loading={loading}
              />
            )}
            {activeTab === "strategies" && (
              <StrategiesView strategies={strategies} />
            )}
            {activeTab === "calculator" && (
              <CalculatorView
                calcInput={calcInput}
                setCalcInput={setCalcInput}
                onCalculate={handleCalculate}
                results={calcResults}
              />
            )}
            {activeTab === "analysis" && (
              <AnalysisView optionsChain={optionsChain} />
            )}
            {activeTab === "positions" && (
              <PositionsView />
            )}
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}

function OptionsChainView({ optionsChain, showCalls, setShowCalls, showPuts, setShowPuts, loading }: any) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center animate-pulse">
        <p className="text-muted-foreground">옵션 체인 로딩 중...</p>
      </div>
    )
  }

  if (!optionsChain) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">옵션 데이터를 조회해주세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">현재가</p>
            <p className="text-lg font-bold text-blue-600">${optionsChain.current_price}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ATM Strike</p>
            <p className="text-lg font-bold">${optionsChain.atm_strike}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">만료일</p>
            <p className="text-lg font-bold">{optionsChain.expiration_date}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">남은 일수</p>
            <p className="text-lg font-bold">{optionsChain.days_to_expiration}일</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">심볼</p>
            <p className="text-lg font-bold">{optionsChain.symbol}</p>
          </div>
        </div>
      </div>

      {/* Toggle Calls/Puts */}
      <div className="bg-card border border-border rounded-lg p-4 flex gap-4">
        <button
          onClick={() => setShowCalls(!showCalls)}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            showCalls
              ? "bg-green-600 text-white"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          <TrendingUp size={18} />
          콜 옵션 {showCalls && "✓"}
        </button>
        <button
          onClick={() => setShowPuts(!showPuts)}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            showPuts
              ? "bg-red-600 text-white"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          <TrendingDown size={18} />
          풋 옵션 {showPuts && "✓"}
        </button>
      </div>

      {/* Calls and Puts Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {showCalls && (
          <OptionTableView title="콜 옵션 (Call)" options={optionsChain.calls} />
        )}
        {showPuts && (
          <OptionTableView title="풋 옵션 (Put)" options={optionsChain.puts} />
        )}
      </div>
    </div>
  )
}

function OptionTableView({ title, options }: { title: string; options: OptionData[] }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-6 py-3 font-bold">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left">Strike</th>
              <th className="px-3 py-2 text-right">Bid</th>
              <th className="px-3 py-2 text-right">Ask</th>
              <th className="px-3 py-2 text-right">IV%</th>
              <th className="px-3 py-2 text-right">Delta</th>
              <th className="px-3 py-2 text-right">Theta</th>
              <th className="px-3 py-2 text-right">Vol</th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt, idx) => (
              <tr key={idx} className="border-b border-border hover:bg-muted/50">
                <td className="px-3 py-2 font-semibold">${opt.strike}</td>
                <td className="px-3 py-2 text-right">${opt.bid.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">${opt.ask.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{opt.implied_volatility.toFixed(1)}%</td>
                <td className={`px-3 py-2 text-right font-semibold ${opt.delta > 0 ? "text-green-600" : "text-red-600"}`}>
                  {opt.delta.toFixed(3)}
                </td>
                <td className="px-3 py-2 text-right">{opt.theta.toFixed(3)}</td>
                <td className="px-3 py-2 text-right">{opt.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StrategiesView({ strategies }: { strategies: Strategy[] }) {
  if (!strategies || strategies.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">전략 정보 없음</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {strategies.map((strategy, idx) => (
        <div key={idx} className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-bold">{strategy.name}</h3>
          </div>
          <p className="text-foreground mb-4">{strategy.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">위험</p>
              <p className="font-semibold text-red-600">{strategy.risk}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">수익</p>
              <p className="font-semibold text-green-600">{strategy.reward}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">손익분기</p>
              <p className="font-semibold">{strategy.break_even}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">최적 시점</p>
              <p className="font-semibold">{strategy.best_when}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CalculatorView({ calcInput, setCalcInput, onCalculate, results }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">옵션 그릭스 계산</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-2">현재가</label>
            <input
              type="number"
              value={calcInput.currentPrice}
              onChange={(e) => setCalcInput({ ...calcInput, currentPrice: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">행사가</label>
            <input
              type="number"
              value={calcInput.strikePrice}
              onChange={(e) => setCalcInput({ ...calcInput, strikePrice: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">남은 일수</label>
            <input
              type="number"
              value={calcInput.daysToExp}
              onChange={(e) => setCalcInput({ ...calcInput, daysToExp: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">내재변동성 (%)</label>
            <input
              type="number"
              value={calcInput.volatility}
              onChange={(e) => setCalcInput({ ...calcInput, volatility: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">무위험이자율 (%)</label>
            <input
              type="number"
              value={calcInput.interestRate}
              onChange={(e) => setCalcInput({ ...calcInput, interestRate: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">옵션 타입</label>
            <select
              value={calcInput.optionType}
              onChange={(e) => setCalcInput({ ...calcInput, optionType: e.target.value })}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground"
            >
              <option value="CALL">콜</option>
              <option value="PUT">풋</option>
            </select>
          </div>
        </div>

        <button
          onClick={onCalculate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
        >
          계산
        </button>
      </div>

      {results && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">계산 결과</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground">Delta</p>
              <p className="text-2xl font-bold text-blue-600">{results.delta?.toFixed(4) || "N/A"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground">Gamma</p>
              <p className="text-2xl font-bold text-blue-600">{results.gamma?.toFixed(6) || "N/A"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground">Theta</p>
              <p className="text-2xl font-bold text-orange-600">{results.theta?.toFixed(4) || "N/A"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground">Vega</p>
              <p className="text-2xl font-bold text-purple-600">{results.vega?.toFixed(4) || "N/A"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground">Rho</p>
              <p className="text-2xl font-bold text-green-600">{results.rho?.toFixed(4) || "N/A"}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground">내재가치</p>
              <p className="text-2xl font-bold">${results.intrinsic_value?.toFixed(2) || "N/A"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AnalysisView({ optionsChain }: { optionsChain: any }) {
  if (!optionsChain) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">옵션 데이터를 먼저 조회해주세요</p>
      </div>
    )
  }

  const atmCall = optionsChain.calls.find((c: any) => c.strike === optionsChain.atm_strike)
  const atmPut = optionsChain.puts.find((p: any) => p.strike === optionsChain.atm_strike)

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">ATM (옆의 돈) 옵션 분석</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {atmCall && (
            <div className="border border-border rounded-lg p-4">
              <h4 className="font-bold text-green-600 mb-3">콜 (Call)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">행사가</span>
                  <span className="font-semibold">${atmCall.strike}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">프리미엄</span>
                  <span className="font-semibold">${atmCall.ask}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delta</span>
                  <span className="font-semibold">{atmCall.delta.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">감마 (Gamma)</span>
                  <span className="font-semibold">{atmCall.gamma.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">세타 (Theta)</span>
                  <span className="font-semibold text-orange-600">{atmCall.theta.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">베가 (Vega)</span>
                  <span className="font-semibold">{atmCall.vega.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IV</span>
                  <span className="font-semibold">{atmCall.implied_volatility.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {atmPut && (
            <div className="border border-border rounded-lg p-4">
              <h4 className="font-bold text-red-600 mb-3">풋 (Put)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">행사가</span>
                  <span className="font-semibold">${atmPut.strike}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">프리미엄</span>
                  <span className="font-semibold">${atmPut.ask}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delta</span>
                  <span className="font-semibold">{atmPut.delta.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">감마 (Gamma)</span>
                  <span className="font-semibold">{atmPut.gamma.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">세타 (Theta)</span>
                  <span className="font-semibold text-orange-600">{atmPut.theta.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">베가 (Vega)</span>
                  <span className="font-semibold">{atmPut.vega.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IV</span>
                  <span className="font-semibold">{atmPut.implied_volatility.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* IV Skew Analysis */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">내재변동성 스큐</h3>
        <div className="text-sm text-muted-foreground">
          <p>내재변동성은 행사가에 따라 다르게 나타나는 경향을 보입니다.</p>
          <p className="mt-2">
            현재 옵션 체인의 모든 행사가에 대해 동일한 IV ({optionsChain.calls[0]?.implied_volatility.toFixed(1)}%)를 적용 중입니다.
          </p>
        </div>
      </div>
    </div>
  )
}

function PositionsView() {
  return (
    <div className="bg-card border border-border rounded-lg p-8 text-center">
      <p className="text-muted-foreground">보유 옵션 포지션이 없습니다</p>
    </div>
  )
}
