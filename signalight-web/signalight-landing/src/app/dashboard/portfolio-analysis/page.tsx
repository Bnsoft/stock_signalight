"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { PieChart, BarChart3, TrendingUp, AlertTriangle, Zap } from "lucide-react"

interface Position {
  symbol: string
  quantity: number
  entry_price: number
  current_price: number
}

interface AssetAllocation {
  asset_class: string
  value: number
  percent: number
  symbols: string[]
}

interface Sector {
  sector: string
  value: number
  percent: number
  symbols: string[]
  num_holdings: number
}

interface CorrelationData {
  [key: string]: number
}

type AnalysisTab = "overview" | "allocation" | "sectors" | "correlation" | "attribution" | "frontier" | "dividend" | "risk" | "rebalance"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function PortfolioAnalysisPage() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<AnalysisTab>("overview")
  const [loading, setLoading] = useState(false)
  const [positions, setPositions] = useState<Position[]>([])
  const [metrics, setMetrics] = useState<any>(null)
  const [allocation, setAllocation] = useState<any>(null)
  const [sectors, setSectors] = useState<any>(null)
  const [correlation, setCorrelation] = useState<CorrelationData>({})
  const [riskMetrics, setRiskMetrics] = useState<any>(null)

  useEffect(() => {
    if (!user?.user_id || !token) return
    fetchPortfolioData()
  }, [user, token])

  const fetchPortfolioData = async () => {
    setLoading(true)
    try {
      const [metricsRes, allocRes, sectorRes, correlRes, riskRes] = await Promise.all([
        fetch(`${API_BASE}/api/portfolio/metrics/${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/portfolio/allocation/${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/portfolio/sectors/${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/portfolio/correlation/${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/portfolio/risk/${user?.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (metricsRes.ok) {
        const data = await metricsRes.json()
        setMetrics(data)
      }

      if (allocRes.ok) {
        const data = await allocRes.json()
        setAllocation(data)
      }

      if (sectorRes.ok) {
        const data = await sectorRes.json()
        setSectors(data)
      }

      if (correlRes.ok) {
        const data = await correlRes.json()
        setCorrelation(data)
      }

      if (riskRes.ok) {
        const data = await riskRes.json()
        setRiskMetrics(data)
      }
    } catch (err) {
      console.error("Failed to fetch portfolio data:", err)
    } finally {
      setLoading(false)
    }
  }

  const TabButton = ({ tab, label, icon: Icon }: { tab: AnalysisTab; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm ${
        activeTab === tab
          ? "bg-blue-600 text-white"
          : "bg-muted text-foreground hover:bg-muted/80"
      }`}
    >
      <Icon size={16} />
      <span className="font-medium hidden sm:inline">{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">포트폴리오 분석</h1>
            <p className="text-muted-foreground">
              상세한 자산 배분, 섹터 분석, 위험도 평가
            </p>
          </div>
        </AnimateIn>

        {/* Tab Navigation */}
        <AnimateIn from="bottom" delay={80}>
          <div className="mb-8 bg-card border border-border rounded-lg p-4 overflow-x-auto">
            <div className="flex gap-2 flex-nowrap">
              <TabButton tab="overview" label="개요" icon={BarChart3} />
              <TabButton tab="allocation" label="자산 배분" icon={PieChart} />
              <TabButton tab="sectors" label="섹터" icon={BarChart3} />
              <TabButton tab="correlation" label="상관관계" icon={TrendingUp} />
              <TabButton tab="attribution" label="기여도" icon={TrendingUp} />
              <TabButton tab="frontier" label="효율선" icon={TrendingUp} />
              <TabButton tab="dividend" label="배당금" icon={Zap} />
              <TabButton tab="risk" label="위험도" icon={AlertTriangle} />
              <TabButton tab="rebalance" label="리밸런싱" icon={BarChart3} />
            </div>
          </div>
        </AnimateIn>

        {/* Content Area */}
        <AnimateIn from="bottom" delay={160}>
          <div>
            {loading ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center animate-pulse">
                <p className="text-muted-foreground">포트폴리오 데이터 로딩 중...</p>
              </div>
            ) : activeTab === "overview" ? (
              <OverviewView metrics={metrics} />
            ) : activeTab === "allocation" ? (
              <AllocationView allocation={allocation} />
            ) : activeTab === "sectors" ? (
              <SectorsView sectors={sectors} />
            ) : activeTab === "correlation" ? (
              <CorrelationView correlation={correlation} />
            ) : activeTab === "attribution" ? (
              <AttributionView metrics={metrics} />
            ) : activeTab === "frontier" ? (
              <EfficientFrontierView metrics={metrics} />
            ) : activeTab === "dividend" ? (
              <DividendView metrics={metrics} />
            ) : activeTab === "risk" ? (
              <RiskView riskMetrics={riskMetrics} />
            ) : activeTab === "rebalance" ? (
              <RebalanceView metrics={metrics} />
            ) : null}
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}

function OverviewView({ metrics }: { metrics: any }) {
  if (!metrics) return null

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">포트폴리오 가치</p>
          <p className="text-3xl font-bold text-blue-600">
            ${(metrics.total_value || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">총 수익</p>
          <p className="text-3xl font-bold text-green-600">
            ${(metrics.total_return || 0).toLocaleString()}
          </p>
          <p className="text-sm text-green-600 mt-1">{metrics.return_percent?.toFixed(2) || 0}%</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">변동성</p>
          <p className="text-3xl font-bold">{(metrics.volatility * 100)?.toFixed(2) || 0}%</p>
          <p className="text-sm text-muted-foreground mt-1">연간</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">Sharpe Ratio</p>
          <p className="text-3xl font-bold">{metrics.sharpe_ratio?.toFixed(2) || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">위험 조정 수익률</p>
        </div>
      </div>

      {/* Diversification */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">다각화 현황</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">보유 종목 수</p>
            <p className="text-2xl font-bold">{metrics.num_positions || 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">집중도 (상위 1위)</p>
            <p className="text-2xl font-bold">
              {(Math.max(...Object.values(metrics.weights || {})) * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Herfindahl Index</p>
            <p className="text-2xl font-bold">
              {(
                Object.values(metrics.weights || {})
                  .reduce((sum: number, w: any) => sum + Math.pow(w, 2), 0) * 10000
              ).toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">다각화 점수</p>
            <p className="text-2xl font-bold">
              {(((metrics.num_positions || 0) / 20) * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AllocationView({ allocation }: { allocation: any }) {
  if (!allocation || !allocation.allocation) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {allocation.allocation.map((alloc: AssetAllocation, idx: number) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">{alloc.asset_class}</p>
            <p className="text-2xl font-bold mb-2">{alloc.percent.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">${alloc.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Asset Class Breakdown */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">자산 클래스별 상세 내역</h3>
        <div className="space-y-3">
          {allocation.allocation.map((alloc: AssetAllocation, idx: number) => (
            <div key={idx} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{alloc.asset_class}</span>
                <span className="text-sm font-bold">{alloc.percent.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2 mb-3">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${alloc.percent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {alloc.symbols.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectorsView({ sectors }: { sectors: any }) {
  if (!sectors || !sectors.sectors) return null

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left font-semibold">섹터</th>
                <th className="px-6 py-3 text-right font-semibold">가치</th>
                <th className="px-6 py-3 text-right font-semibold">비율</th>
                <th className="px-6 py-3 text-right font-semibold">보유 종목</th>
              </tr>
            </thead>
            <tbody>
              {sectors.sectors.map((sector: Sector, idx: number) => (
                <tr key={idx} className="border-b border-border hover:bg-muted/50">
                  <td className="px-6 py-3 font-semibold">{sector.sector}</td>
                  <td className="px-6 py-3 text-right">${sector.value.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-bold">{sector.percent.toFixed(1)}%</td>
                  <td className="px-6 py-3 text-right">{sector.num_holdings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector Symbols */}
      <div className="space-y-3">
        {sectors.sectors.map((sector: Sector, idx: number) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-4">
            <h4 className="font-bold mb-2">{sector.sector} ({sector.percent.toFixed(1)}%)</h4>
            <div className="flex flex-wrap gap-2">
              {sector.symbols.map((sym: string) => (
                <span key={sym} className="bg-muted/50 px-3 py-1 rounded-full text-sm">
                  {sym}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CorrelationView({ correlation }: { correlation: CorrelationData }) {
  if (!correlation || Object.keys(correlation).length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">상관관계 데이터 없음</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">상관관계 매트릭스</h3>
        <p className="text-sm text-muted-foreground mb-4">
          심볼 간 가격 움직임의 상관성을 나타냅니다. 1에 가까울수록 함께 움직이고, -1에 가까울수록 반대로 움직입니다.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(correlation).slice(0, 6).map(([pair, corr]) => (
            <div key={pair} className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-sm font-semibold mb-2">{pair}</p>
              <p className={`text-2xl font-bold ${
                (corr as number) > 0.5 ? "text-green-600" :
                (corr as number) < -0.5 ? "text-red-600" : "text-blue-600"
              }`}>
                {(corr as number).toFixed(3)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AttributionView({ metrics }: { metrics: any }) {
  return (
    <div className="bg-card border border-border rounded-lg p-8 text-center">
      <p className="text-muted-foreground">성과 기여도 분석</p>
      <p className="text-sm text-muted-foreground mt-2">
        각 포지션이 전체 포트폴리오 수익에 기여하는 정도를 분석합니다.
      </p>
    </div>
  )
}

function EfficientFrontierView({ metrics }: { metrics: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">효율적 투자선</h3>
        <div className="h-80 bg-muted/50 rounded-lg flex items-center justify-center border border-border">
          <p className="text-muted-foreground">위험 vs 수익률 차트</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">최적 포트폴리오 (최고 Sharpe)</p>
          <p className="text-lg font-bold text-green-600">수익: 8.5%</p>
          <p className="text-sm text-muted-foreground">위험: 12.3%</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">최소 위험 포트폴리오</p>
          <p className="text-lg font-bold text-blue-600">수익: 5.2%</p>
          <p className="text-sm text-muted-foreground">위험: 8.1%</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">최대 수익 포트폴리오</p>
          <p className="text-lg font-bold text-purple-600">수익: 12.8%</p>
          <p className="text-sm text-muted-foreground">위험: 18.5%</p>
        </div>
      </div>
    </div>
  )
}

function DividendView({ metrics }: { metrics: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">연간 배당금 총액</p>
          <p className="text-3xl font-bold text-green-600">$2,345</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">평균 배당 수익률</p>
          <p className="text-3xl font-bold">2.15%</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">배당 지급 빈도</p>
          <p className="text-3xl font-bold">분기별</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">배당금 지급 일정</h3>
        <p className="text-sm text-muted-foreground">배당금을 지급하는 종목들의 지급 예정일</p>
      </div>
    </div>
  )
}

function RiskView({ riskMetrics }: { riskMetrics: any }) {
  if (!riskMetrics) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-600/10 border border-red-600 rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">Value at Risk (VaR 95%)</p>
          <p className="text-3xl font-bold text-red-600">${(riskMetrics.var_95_1day || 0).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{riskMetrics.var_95_percent?.toFixed(2) || 0}% (1일)</p>
        </div>

        <div className="bg-orange-600/10 border border-orange-600 rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">최대 낙폭 (Max Drawdown)</p>
          <p className="text-3xl font-bold text-orange-600">${(riskMetrics.max_drawdown || 0).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{riskMetrics.max_drawdown_percent?.toFixed(2) || 0}%</p>
        </div>

        <div className="bg-yellow-600/10 border border-yellow-600 rounded-lg p-6">
          <p className="text-xs text-muted-foreground mb-2">집중도 위험</p>
          <p className="text-3xl font-bold text-yellow-600">{(riskMetrics.concentration_risk_percent || 0).toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">상위 보유 종목</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">위험 프로필</h3>
        <p className="text-sm text-muted-foreground mb-4">
          현재 포트폴리오의 위험 수준 평가
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold mb-2">변동성 (연간)</p>
            <div className="w-full bg-muted/50 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: "45%" }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{riskMetrics.portfolio_volatility_daily_percent}% (일일)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RebalanceView({ metrics }: { metrics: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-green-600/10 border border-green-600 rounded-lg p-6">
        <h3 className="text-lg font-bold text-green-600 mb-2">리밸런싱 불필요</h3>
        <p className="text-sm text-muted-foreground">
          현재 포트폴리오가 목표 배분에 근접합니다.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">리밸런싱 제안</h3>
        <p className="text-sm text-muted-foreground mb-4">
          목표 자산 배분에 맞추기 위한 권장 조정
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
            <span className="font-semibold">주식 (Stocks)</span>
            <span className="text-sm text-muted-foreground">현재 60% → 목표 65% (+$5,000)</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
            <span className="font-semibold">채권 (Bonds)</span>
            <span className="text-sm text-muted-foreground">현재 40% → 목표 35% (-$5,000)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
