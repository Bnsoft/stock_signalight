"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { TrendingUp, TrendingDown, Activity, Volume2, LineChart, Zap, Settings2, Search } from "lucide-react"

interface Stock {
  symbol: string
  price?: number
  change_percent?: number
  volume?: number
  [key: string]: any
}

interface ScreenerResult {
  symbol: string
  rsi?: number
  signal?: string
  price?: number
  volume?: number
  score?: number
  matches?: number
  rank?: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

type ScreenerTab = "gainers" | "losers" | "rsi" | "macd" | "volume" | "ma" | "bollinger" | "market"

export default function ScreenerPage() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<ScreenerTab>("gainers")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [marketStats, setMarketStats] = useState<any>(null)
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 10000,
    minVolume: 0,
  })

  useEffect(() => {
    if (!token) return
    fetchScreenerData(activeTab)
  }, [activeTab, token])

  const fetchScreenerData = async (screenType: ScreenerTab) => {
    setLoading(true)
    try {
      const endpoints: Record<ScreenerTab, string> = {
        gainers: "/api/screener/gainers",
        losers: "/api/screener/losers",
        rsi: "/api/screener/rsi",
        macd: "/api/screener/macd",
        volume: "/api/screener/volume",
        ma: "/api/screener/ma-cross",
        bollinger: "/api/screener/bollinger",
        market: "/api/market/stats",
      }

      const res = await fetch(`${API_BASE}${endpoints[screenType]}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setResults(data)
        if (screenType === "market") {
          setMarketStats(data)
        }
      }
    } catch (err) {
      console.error("Failed to fetch screener data:", err)
    } finally {
      setLoading(false)
    }
  }

  const TabButton = ({ tab, label, icon: Icon }: { tab: ScreenerTab; label: string; icon: any }) => (
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
            <h1 className="text-3xl font-bold mb-2">주식 스크리닝</h1>
            <p className="text-muted-foreground">
              기술적 지표 및 시장 데이터로 투자 기회 발견
            </p>
          </div>
        </AnimateIn>

        {/* Tab Navigation */}
        <AnimateIn from="bottom" delay={80}>
          <div className="mb-8 bg-card border border-border rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              <TabButton tab="gainers" label="상승 종목" icon={TrendingUp} />
              <TabButton tab="losers" label="하락 종목" icon={TrendingDown} />
              <TabButton tab="rsi" label="RSI" icon={Activity} />
              <TabButton tab="macd" label="MACD" icon={LineChart} />
              <TabButton tab="volume" label="거래량" icon={Volume2} />
              <TabButton tab="ma" label="이동평균" icon={Zap} />
              <TabButton tab="bollinger" label="볼린저" icon={LineChart} />
              <TabButton tab="market" label="시장통계" icon={Settings2} />
            </div>
          </div>
        </AnimateIn>

        {/* Content Area */}
        <AnimateIn from="bottom" delay={160}>
          <div className="space-y-4">
            {loading ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center animate-pulse">
                <p className="text-muted-foreground">로딩 중...</p>
              </div>
            ) : activeTab === "gainers" || activeTab === "losers" ? (
              <GainersLosersView results={results} type={activeTab} />
            ) : activeTab === "rsi" ? (
              <RSIView results={results} />
            ) : activeTab === "macd" ? (
              <MACDView results={results} />
            ) : activeTab === "volume" ? (
              <VolumeView results={results} />
            ) : activeTab === "ma" ? (
              <MovingAverageView results={results} />
            ) : activeTab === "bollinger" ? (
              <BollingerView results={results} />
            ) : activeTab === "market" ? (
              <MarketStatsView stats={marketStats} />
            ) : null}
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}

function GainersLosersView({ results, type }: { results: ScreenerResult[]; type: string }) {
  if (!results || !Array.isArray(results)) return null

  const isGainers = type === "gainers"

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left text-sm font-semibold">순위</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">종목</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">가격</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">등락률</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">거래량</th>
            </tr>
          </thead>
          <tbody>
            {results.map((stock, idx) => (
              <tr
                key={idx}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="px-6 py-3 text-sm font-medium">{stock.rank || idx + 1}</td>
                <td className="px-6 py-3 text-sm font-bold">{stock.symbol}</td>
                <td className="px-6 py-3 text-right text-sm">
                  ${stock.price?.toFixed(2) || "N/A"}
                </td>
                <td
                  className={`px-6 py-3 text-right text-sm font-semibold ${
                    isGainers
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {isGainers ? "+" : ""}{stock.change_percent?.toFixed(2) || "0.00"}%
                </td>
                <td className="px-6 py-3 text-right text-sm text-muted-foreground">
                  {stock.volume?.toLocaleString() || "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RSIView({ results }: { results: any }) {
  if (!results) return null

  const sections = [
    { key: "OVERSOLD", label: "과매도 (강한 매수 신호)", color: "bg-green-600/10 border-green-600" },
    { key: "NORMAL", label: "중립", color: "bg-blue-600/10 border-blue-600" },
    { key: "OVERBOUGHT", label: "과매수 (강한 매도 신호)", color: "bg-red-600/10 border-red-600" },
  ]

  return (
    <div className="space-y-4">
      {sections.map(({ key, label, color }) => (
        <div key={key} className={`border rounded-lg p-4 ${color}`}>
          <h3 className="font-semibold mb-3">{label}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {results[key]?.length > 0 ? (
              results[key].map((stock: ScreenerResult, idx: number) => (
                <div key={idx} className="bg-card border border-border rounded-lg p-3">
                  <p className="font-bold text-sm">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground">RSI: {stock.rsi?.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stock.signal}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground col-span-full">해당 종목 없음</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function MACDView({ results }: { results: any }) {
  if (!results) return null

  const sections = [
    { key: "BULLISH_CROSS", label: "강한 매수 신호 (상승 교차)", color: "bg-green-600/10 border-green-600" },
    { key: "STRONG_UPTREND", label: "강한 상승추세", color: "bg-blue-600/10 border-blue-600" },
    { key: "BEARISH_CROSS", label: "강한 매도 신호 (하강 교차)", color: "bg-red-600/10 border-red-600" },
    { key: "STRONG_DOWNTREND", label: "강한 하락추세", color: "bg-orange-600/10 border-orange-600" },
  ]

  return (
    <div className="space-y-4">
      {sections.map(({ key, label, color }) => (
        <div key={key} className={`border rounded-lg p-4 ${color}`}>
          <h3 className="font-semibold mb-3">{label}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {results[key]?.length > 0 ? (
              results[key].map((stock: ScreenerResult, idx: number) => (
                <div key={idx} className="bg-card border border-border rounded-lg p-3">
                  <p className="font-bold text-sm">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground">
                    강도: {stock.strength}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground col-span-full">해당 종목 없음</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function VolumeView({ results }: { results: any }) {
  if (!results || !Array.isArray(results)) return null

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-3 text-left text-sm font-semibold">종목</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">가격</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">거래량</th>
              <th className="px-6 py-3 text-right text-sm font-semibold">등락률</th>
            </tr>
          </thead>
          <tbody>
            {results.map((stock: ScreenerResult, idx: number) => (
              <tr
                key={idx}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="px-6 py-3 text-sm font-bold">{stock.symbol}</td>
                <td className="px-6 py-3 text-right text-sm">
                  ${stock.price?.toFixed(2) || "N/A"}
                </td>
                <td className="px-6 py-3 text-right text-sm text-blue-600 font-semibold">
                  {stock.volume?.toLocaleString() || "N/A"}
                </td>
                <td
                  className={`px-6 py-3 text-right text-sm font-semibold ${
                    (stock.change_percent || 0) >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {(stock.change_percent || 0) >= 0 ? "+" : ""}{stock.change_percent?.toFixed(2) || "0.00"}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MovingAverageView({ results }: { results: any }) {
  if (!results) return null

  const sections = [
    { key: "MA_GOLDEN_CROSS", label: "골든크로스 (강한 매수)", color: "bg-green-600/10 border-green-600" },
    { key: "PRICE_ABOVE_MA", label: "가격 > 이동평균", color: "bg-blue-600/10 border-blue-600" },
    { key: "MA_DEATH_CROSS", label: "데드크로스 (강한 매도)", color: "bg-red-600/10 border-red-600" },
    { key: "PRICE_BELOW_MA", label: "가격 < 이동평균", color: "bg-orange-600/10 border-orange-600" },
  ]

  return (
    <div className="space-y-4">
      {sections.map(({ key, label, color }) => (
        <div key={key} className={`border rounded-lg p-4 ${color}`}>
          <h3 className="font-semibold mb-3">{label}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {results[key]?.length > 0 ? (
              results[key].map((stock: any, idx: number) => (
                <div key={idx} className="bg-card border border-border rounded-lg p-3">
                  <p className="font-bold text-sm">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    SMA50: {stock.sma50}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    SMA200: {stock.sma200}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground col-span-full">해당 종목 없음</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function BollingerView({ results }: { results: any }) {
  if (!results) return null

  const sections = [
    { key: "UPPER_BAND_TOUCH", label: "상단 밴드 터치 (매도 신호)", color: "bg-red-600/10 border-red-600" },
    { key: "LOWER_BAND_TOUCH", label: "하단 밴드 터치 (매수 신호)", color: "bg-green-600/10 border-green-600" },
    { key: "SQUEEZE", label: "밴드 축소 (변동성 낮음)", color: "bg-blue-600/10 border-blue-600" },
    { key: "BREAKOUT", label: "밴드 이탈 (변동성 높음)", color: "bg-orange-600/10 border-orange-600" },
  ]

  return (
    <div className="space-y-4">
      {sections.map(({ key, label, color }) => (
        <div key={key} className={`border rounded-lg p-4 ${color}`}>
          <h3 className="font-semibold mb-3">{label}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {results[key]?.length > 0 ? (
              results[key].map((stock: any, idx: number) => (
                <div key={idx} className="bg-card border border-border rounded-lg p-3">
                  <p className="font-bold text-sm">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    상단: {stock.upper_band}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    하단: {stock.lower_band}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground col-span-full">해당 종목 없음</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function MarketStatsView({ stats }: { stats: any }) {
  if (!stats) return null

  const statItems = [
    { label: "시장 상태", value: stats.overall_market_trend, color: "text-blue-600" },
    { label: "상승 종목", value: `${stats.advancing_stocks}개`, color: "text-green-600" },
    { label: "하락 종목", value: `${stats.declining_stocks}개`, color: "text-red-600" },
    { label: "보합 종목", value: `${stats.unchanged_stocks}개`, color: "text-gray-600" },
    { label: "상승/하락 비율", value: stats.advance_decline_ratio?.toFixed(2), color: "text-blue-600" },
    { label: "시장 강도", value: stats.market_breadth, color: "text-purple-600" },
    { label: "VIX", value: stats.vix?.toFixed(2), color: "text-orange-600" },
    { label: "시장 개장", value: stats.market_open, color: "text-gray-600" },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statItems.map((item, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">{item.label}</p>
            <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Market Overview Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">시장 개요</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">시장 시간</span>
            <span className="font-semibold">{stats.market_open} ~ {stats.market_close}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">거래 전 시간</span>
            <span className="font-semibold">{stats.premarket_hours}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">거래 후 시간</span>
            <span className="font-semibold">{stats.afterhours_hours}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-muted-foreground">총 시가총액</span>
            <span className="font-semibold">${(stats.market_cap_total / 1e12).toFixed(2)}조</span>
          </div>
        </div>
      </div>
    </div>
  )
}
