"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import {
  PieChart,
  TrendingUp,
  Zap,
  Database,
  Activity,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"

interface PortfolioAnalysis {
  totalValue: number
  totalGain: number
  totalGainPercent: number
  allocations: Array<{
    symbol: string
    value: number
    percent: number
    shares: number
  }>
  sectors: Array<{
    name: string
    value: number
    percent: number
  }>
  metrics: {
    beta: number
    sharpeRatio: number
    maxDrawdown: number
    volatility: number
    correlation: number
  }
  topGainers: Array<{
    symbol: string
    change: number
    changePercent: number
  }>
  topLosers: Array<{
    symbol: string
    change: number
    changePercent: number
  }>
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const sectorColors: Record<string, string> = {
  Technology: "bg-blue-600",
  Healthcare: "bg-green-600",
  Finance: "bg-purple-600",
  Energy: "bg-red-600",
  Materials: "bg-yellow-600",
  Industrials: "bg-orange-600",
  Consumer: "bg-pink-600",
  Communications: "bg-indigo-600",
  Utilities: "bg-teal-600",
  "Real Estate": "bg-cyan-600",
}

export default function PortfolioAnalysisPage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()

  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    loadAnalysis()
  }, [])

  const loadAnalysis = async () => {
    try {
      setLoading(true)

      const response = await fetch(`${API_BASE}/api/portfolio/analysis`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to load portfolio analysis")

      const data = await response.json()
      setAnalysis(data.data)
    } catch (err) {
      showError("포트폴리오 분석을 로드할 수 없습니다")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <AlertCircle className="mx-auto mb-4 text-muted-foreground" size={32} />
            <p className="text-muted-foreground">포트폴리오 데이터를 로드할 수 없습니다</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">포트폴리오 분석</h1>
            <p className="text-muted-foreground">
              포트폴리오의 성과 및 구성을 분석하세요
            </p>
          </div>
        </AnimateIn>

        {/* 요약 카드 */}
        <AnimateIn from="bottom" delay={80}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">포트폴리오 총 가치</p>
              <p className="text-3xl font-bold">
                ${analysis.totalValue.toFixed(0)}
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">총 수익</p>
              <p
                className={`text-3xl font-bold ${
                  analysis.totalGain >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {analysis.totalGain >= 0 ? "+" : ""}${analysis.totalGain.toFixed(0)}
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">수익률</p>
              <p
                className={`text-3xl font-bold ${
                  analysis.totalGainPercent >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {analysis.totalGainPercent >= 0 ? "+" : ""}
                {analysis.totalGainPercent.toFixed(2)}%
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">섹터 수</p>
              <p className="text-3xl font-bold">{analysis.sectors.length}</p>
            </div>
          </div>
        </AnimateIn>

        {/* 탭 네비게이션 */}
        <AnimateIn from="bottom" delay={160}>
          <div className="flex gap-2 mb-6 border-b border-border">
            {[
              { id: "overview", label: "개요" },
              { id: "allocation", label: "자산 배분" },
              { id: "sectors", label: "섹터 분석" },
              { id: "metrics", label: "위험 메트릭" },
              { id: "performance", label: "수익 분석" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 font-semibold border-b-2 transition-all ${
                  activeTab === id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </AnimateIn>

        {/* 개요 탭 */}
        {activeTab === "overview" && (
          <AnimateIn from="bottom" delay={240}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 상위 수익 종목 */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={20} className="text-green-600" />
                  <h3 className="text-lg font-bold">상위 수익 종목</h3>
                </div>
                <div className="space-y-3">
                  {analysis.topGainers.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="font-bold">{stock.symbol}</span>
                      <span className="text-sm text-green-600 font-semibold">
                        +{stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 상위 손실 종목 */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={20} className="text-red-600" style={{ transform: "scaleY(-1)" }} />
                  <h3 className="text-lg font-bold">상위 손실 종목</h3>
                </div>
                <div className="space-y-3">
                  {analysis.topLosers.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="font-bold">{stock.symbol}</span>
                      <span className="text-sm text-red-600 font-semibold">
                        {stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* 자산 배분 탭 */}
        {activeTab === "allocation" && (
          <AnimateIn from="bottom" delay={240}>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-6">자산 배분</h3>
              <div className="space-y-3">
                {analysis.allocations.map((alloc) => (
                  <div key={alloc.symbol}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{alloc.symbol}</span>
                      <span className="text-sm text-muted-foreground">
                        {alloc.shares} 주 - ${alloc.value.toFixed(0)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${alloc.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alloc.percent.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        )}

        {/* 섹터 분석 탭 */}
        {activeTab === "sectors" && (
          <AnimateIn from="bottom" delay={240}>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-6">섹터 분석</h3>
              <div className="space-y-4">
                {analysis.sectors.map((sector) => (
                  <div key={sector.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{sector.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ${sector.value.toFixed(0)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          sectorColors[sector.name] || "bg-gray-600"
                        }`}
                        style={{ width: `${sector.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sector.percent.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        )}

        {/* 위험 메트릭 탭 */}
        {activeTab === "metrics" && (
          <AnimateIn from="bottom" delay={240}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={20} className="text-yellow-600" />
                  <h3 className="text-lg font-bold">포트폴리오 베타</h3>
                </div>
                <p className="text-4xl font-bold text-yellow-600">
                  {analysis.metrics.beta.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  시장 변동성 대비 민감도
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={20} className="text-green-600" />
                  <h3 className="text-lg font-bold">샤프 지수</h3>
                </div>
                <p className="text-4xl font-bold text-green-600">
                  {analysis.metrics.sharpeRatio.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  위험 조정 수익률
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={20} className="text-red-600" />
                  <h3 className="text-lg font-bold">최대 낙폭</h3>
                </div>
                <p className="text-4xl font-bold text-red-600">
                  -{analysis.metrics.maxDrawdown.toFixed(2)}%
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  역사적 최대 손실
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Database size={20} className="text-purple-600" />
                  <h3 className="text-lg font-bold">변동성</h3>
                </div>
                <p className="text-4xl font-bold text-purple-600">
                  {analysis.metrics.volatility.toFixed(2)}%
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  연 환산 표준편차
                </p>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* 수익 분석 탭 */}
        {activeTab === "performance" && (
          <AnimateIn from="bottom" delay={240}>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-6">포트폴리오 수익 분석</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    종목 수
                  </p>
                  <p className="text-2xl font-bold">
                    {analysis.allocations.length}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    평균 보유 수익률
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      analysis.totalGainPercent >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {analysis.totalGainPercent >= 0 ? "+" : ""}
                    {(analysis.totalGainPercent / analysis.allocations.length).toFixed(
                      2
                    )}
                    %
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    상관관계
                  </p>
                  <p className="text-2xl font-bold">
                    {analysis.metrics.correlation.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-600/10 border border-blue-600 rounded-lg">
                <p className="text-sm text-blue-600">
                  💡 팁: 포트폴리오 상관관계가 낮을수록 분산 효과가 높습니다
                </p>
              </div>
            </div>
          </AnimateIn>
        )}

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
