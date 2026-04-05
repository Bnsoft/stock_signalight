"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { TrendingUp, TrendingDown, Activity, Zap, Globe, Coins, DollarSign } from "lucide-react"

interface MarketData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume?: number
  marketCap?: number
}

type ViewType = "stocks" | "crypto" | "futures" | "forex" | "bonds"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function MarketOverviewPage() {
  const { token } = useAuth()
  const [activeView, setActiveView] = useState<ViewType>("stocks")
  const [loading, setLoading] = useState(false)
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [marketStats, setMarketStats] = useState<any>(null)
  const [cryptoPrices, setCryptoPrices] = useState<MarketData[]>([])
  const [futures, setFutures] = useState<any[]>([])
  const [forex, setForex] = useState<any[]>([])
  const [bonds, setBonds] = useState<any[]>([])

  useEffect(() => {
    if (!token) return
    fetchMarketData()
  }, [activeView, token])

  const fetchMarketData = async () => {
    setLoading(true)
    try {
      if (activeView === "stocks") {
        const res = await fetch(`${API_BASE}/api/market/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setMarketStats(data)
        }
      } else if (activeView === "crypto") {
        const res = await fetch(`${API_BASE}/api/market/crypto`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setCryptoPrices(data)
        }
      } else if (activeView === "futures") {
        const res = await fetch(`${API_BASE}/api/market/futures`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setFutures(data)
        }
      } else if (activeView === "forex") {
        const res = await fetch(`${API_BASE}/api/market/forex`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setForex(data)
        }
      } else if (activeView === "bonds") {
        const res = await fetch(`${API_BASE}/api/market/bonds`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setBonds(data)
        }
      }
    } catch (err) {
      console.error("Failed to fetch market data:", err)
    } finally {
      setLoading(false)
    }
  }

  const ViewButton = ({ type, label, icon: Icon }: { type: ViewType; label: string; icon: any }) => (
    <button
      onClick={() => setActiveView(type)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        activeView === type
          ? "bg-blue-600 text-white"
          : "bg-muted text-foreground hover:bg-muted/80"
      }`}
    >
      <Icon size={18} />
      <span className="font-medium">{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">시장 개요</h1>
            <p className="text-muted-foreground">
              주식, 암호화폐, 선물, 외환, 채권 시장 통합 분석
            </p>
          </div>
        </AnimateIn>

        {/* View Selector */}
        <AnimateIn from="bottom" delay={80}>
          <div className="mb-8 bg-card border border-border rounded-lg p-4">
            <div className="flex gap-2 flex-wrap">
              <ViewButton type="stocks" label="주식" icon={Activity} />
              <ViewButton type="crypto" label="암호화폐" icon={Coins} />
              <ViewButton type="futures" label="선물" icon={TrendingUp} />
              <ViewButton type="forex" label="외환" icon={Globe} />
              <ViewButton type="bonds" label="채권" icon={DollarSign} />
            </div>
          </div>
        </AnimateIn>

        {/* Content */}
        <AnimateIn from="bottom" delay={160}>
          <div>
            {loading ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center animate-pulse">
                <p className="text-muted-foreground">데이터 로딩 중...</p>
              </div>
            ) : activeView === "stocks" ? (
              <StocksMarketView stats={marketStats} />
            ) : activeView === "crypto" ? (
              <CryptoMarketView prices={cryptoPrices} />
            ) : activeView === "futures" ? (
              <FuturesMarketView futures={futures} />
            ) : activeView === "forex" ? (
              <ForexMarketView rates={forex} />
            ) : activeView === "bonds" ? (
              <BondsMarketView bonds={bonds} />
            ) : null}
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}

function StocksMarketView({ stats }: { stats: any }) {
  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Market Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">시장 상태</p>
          <p className="text-2xl font-bold text-blue-600">{stats.overall_market_trend || "BULLISH"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">상승 종목</p>
          <p className="text-2xl font-bold text-green-600">{(stats.advancing_stocks || 2150).toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">하락 종목</p>
          <p className="text-2xl font-bold text-red-600">{(stats.declining_stocks || 850).toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">VIX</p>
          <p className="text-2xl font-bold">{(stats.vix || 15.2).toFixed(1)}</p>
        </div>
      </div>

      {/* Market Breadth */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">시장 지표</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">상승/하락 비율</span>
            <span className="font-bold text-green-600">{(stats.advance_decline_ratio || 2.53).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">시장 강도</span>
            <span className="font-bold text-blue-600">{stats.market_breadth || "STRONG"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">총 시가총액</span>
            <span className="font-bold">${((stats.market_cap_total || 45e12) / 1e12).toFixed(1)}조</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">시장 개장</span>
            <span className="font-bold">{stats.market_open || "09:30 EST"}</span>
          </div>
        </div>
      </div>

      {/* Sector Performance */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">섹터 성과 (상위 5)</h3>
        <div className="space-y-2">
          {[
            { name: "Technology", change: 2.34 },
            { name: "Healthcare", change: 1.67 },
            { name: "Financials", change: 0.89 },
            { name: "Energy", change: -0.45 },
            { name: "Consumer", change: -1.23 },
          ].map((sector, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
              <span className="font-medium">{sector.name}</span>
              <span className={`font-bold ${sector.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {sector.change > 0 ? "+" : ""}{sector.change}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CryptoMarketView({ prices }: { prices: any[] }) {
  if (!prices || prices.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Top Gainers/Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-600/10 border border-green-600 rounded-lg p-4">
          <h3 className="font-bold text-green-600 mb-3">상승 암호화폐 TOP 3</h3>
          {prices
            .sort((a, b) => (b.change_percent || 0) - (a.change_percent || 0))
            .slice(0, 3)
            .map((crypto, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-green-600/20 last:border-0">
                <span className="font-semibold">{crypto.symbol}</span>
                <span className="text-green-600 font-bold">+{(crypto.change_percent || 0).toFixed(2)}%</span>
              </div>
            ))}
        </div>

        <div className="bg-red-600/10 border border-red-600 rounded-lg p-4">
          <h3 className="font-bold text-red-600 mb-3">하락 암호화폐 TOP 3</h3>
          {prices
            .sort((a, b) => (a.change_percent || 0) - (b.change_percent || 0))
            .slice(0, 3)
            .map((crypto, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-red-600/20 last:border-0">
                <span className="font-semibold">{crypto.symbol}</span>
                <span className="text-red-600 font-bold">{(crypto.change_percent || 0).toFixed(2)}%</span>
              </div>
            ))}
        </div>
      </div>

      {/* Full Crypto List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left">심볼</th>
                <th className="px-6 py-3 text-left">이름</th>
                <th className="px-6 py-3 text-right">가격</th>
                <th className="px-6 py-3 text-right">변동률</th>
                <th className="px-6 py-3 text-right">시가총액</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((crypto, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-muted/50">
                  <td className="px-6 py-3 font-bold">{crypto.symbol}</td>
                  <td className="px-6 py-3">{crypto.name}</td>
                  <td className="px-6 py-3 text-right">${crypto.price?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "N/A"}</td>
                  <td className={`px-6 py-3 text-right font-bold ${(crypto.change_percent || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {(crypto.change_percent || 0) > 0 ? "+" : ""}{(crypto.change_percent || 0).toFixed(2)}%
                  </td>
                  <td className="px-6 py-3 text-right">${((crypto.market_cap || 0) / 1e9).toFixed(0)}B</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FuturesMarketView({ futures }: { futures: any[] }) {
  if (!futures || futures.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left">심볼</th>
                <th className="px-6 py-3 text-left">이름</th>
                <th className="px-6 py-3 text-right">가격</th>
                <th className="px-6 py-3 text-right">변동률</th>
                <th className="px-6 py-3 text-right">만료일</th>
                <th className="px-6 py-3 text-right">미결제약정</th>
              </tr>
            </thead>
            <tbody>
              {futures.map((future, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-muted/50">
                  <td className="px-6 py-3 font-bold">{future.symbol}</td>
                  <td className="px-6 py-3">{future.name}</td>
                  <td className="px-6 py-3 text-right">${future.price?.toFixed(2) || "N/A"}</td>
                  <td className={`px-6 py-3 text-right font-bold ${future.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {future.change > 0 ? "+" : ""}{future.change?.toFixed(2)}%
                  </td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{future.expiration}</td>
                  <td className="px-6 py-3 text-right">{(future.open_interest / 1e6).toFixed(1)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ForexMarketView({ rates }: { rates: any[] }) {
  if (!rates || rates.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left">통화쌍</th>
                <th className="px-6 py-3 text-right">환율</th>
                <th className="px-6 py-3 text-right">Bid</th>
                <th className="px-6 py-3 text-right">Ask</th>
                <th className="px-6 py-3 text-right">변동률</th>
                <th className="px-6 py-3 text-right">Spread (pips)</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-muted/50">
                  <td className="px-6 py-3 font-bold">{rate.symbol}</td>
                  <td className="px-6 py-3 text-right">{rate.rate?.toFixed(4)}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{rate.bid?.toFixed(4)}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">{rate.ask?.toFixed(4)}</td>
                  <td className={`px-6 py-3 text-right font-bold ${(rate.change_percent || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {(rate.change_percent || 0) > 0 ? "+" : ""}{(rate.change_percent || 0).toFixed(2)}%
                  </td>
                  <td className="px-6 py-3 text-right">{rate.spread_pips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function BondsMarketView({ bonds }: { bonds: any[] }) {
  if (!bonds || bonds.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Yield Curve Info */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">수익률 곡선</h3>
        <div className="h-48 bg-muted/50 rounded-lg flex items-center justify-center border border-border">
          <p className="text-muted-foreground">수익률 곡선 차트</p>
        </div>
      </div>

      {/* Bond List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left">심볼</th>
                <th className="px-6 py-3 text-left">이름</th>
                <th className="px-6 py-3 text-right">가격</th>
                <th className="px-6 py-3 text-right">수익률</th>
                <th className="px-6 py-3 text-right">듀레이션</th>
                <th className="px-6 py-3 text-right">변동률</th>
              </tr>
            </thead>
            <tbody>
              {bonds.map((bond, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-muted/50">
                  <td className="px-6 py-3 font-bold">{bond.symbol}</td>
                  <td className="px-6 py-3">{bond.name}</td>
                  <td className="px-6 py-3 text-right">{bond.price?.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-semibold">{(bond.yield_percent || 0).toFixed(2)}%</td>
                  <td className="px-6 py-3 text-right">{(bond.duration || 0).toFixed(1)}y</td>
                  <td className={`px-6 py-3 text-right font-bold ${(bond.change || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {(bond.change || 0) > 0 ? "+" : ""}{(bond.change || 0).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
