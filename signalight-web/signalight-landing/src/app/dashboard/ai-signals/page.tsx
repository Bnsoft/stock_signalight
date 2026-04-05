"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Zap, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react"

interface Signal {
  id: number
  symbol: string
  signal_type: string
  confidence_score: number
  message: string
  created_at: string
}

interface Pattern {
  type: string
  confidence: number
  signal: string
}

interface RiskProfile {
  risk_profile: string
  experience_level: string
  avg_roi: number
}

interface Anomaly {
  type: string
  severity: string
  count?: number
  message: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AISignalsPage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null)
  const [recommendations, setRecommendations] = useState<Signal[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState("QQQ")
  const [predictions, setPredictions] = useState<any>(null)

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchAIData = async () => {
      try {
        // Fetch risk profile
        const profileRes = await fetch(`${API_BASE}/api/user/${user.user_id}/risk-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (profileRes.ok) {
          const data = await profileRes.json()
          setRiskProfile(data)
        }

        // Fetch recommendations
        const recsRes = await fetch(`${API_BASE}/api/recommendations/${user.user_id}?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (recsRes.ok) {
          const data = await recsRes.json()
          setRecommendations(data.recommendations)
        }

        // Fetch patterns
        const patternsRes = await fetch(`${API_BASE}/api/patterns/${selectedSymbol}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (patternsRes.ok) {
          const data = await patternsRes.json()
          setPatterns(data.patterns)
        }

        // Fetch anomalies
        const anomaliesRes = await fetch(`${API_BASE}/api/anomalies/${selectedSymbol}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (anomaliesRes.ok) {
          const data = await anomaliesRes.json()
          setAnomalies(data.anomalies)
        }

        // Fetch predictions
        const predictionsRes = await fetch(`${API_BASE}/api/predictions/${selectedSymbol}`, {
          headers: { Authorization: `Bearer ${token}` },
          method: "POST",
        })
        if (predictionsRes.ok) {
          const data = await predictionsRes.json()
          setPredictions(data.predictions)
        }
      } catch (err) {
        console.error("Failed to load AI data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAIData()
  }, [user, token, selectedSymbol])

  if (loading) {
    return <div className="min-h-screen bg-background p-6 animate-pulse" />
  }

  const getRiskProfileColor = (profile: string) => {
    switch (profile) {
      case "aggressive":
        return "text-red-600"
      case "moderate":
        return "text-yellow-600"
      case "conservative":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  const getRiskProfileBg = (profile: string) => {
    switch (profile) {
      case "aggressive":
        return "bg-red-500/10 border-red-500/30"
      case "moderate":
        return "bg-yellow-500/10 border-yellow-500/30"
      case "conservative":
        return "bg-green-500/10 border-green-500/30"
      default:
        return "bg-gray-500/10 border-gray-500/30"
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Zap className="w-8 h-8 text-yellow-500" />
              AI 신호 분석
            </h1>
            <p className="text-muted-foreground">
              머신러닝 기반 신호 추천 및 시장 패턴 감지
            </p>
          </div>
        </AnimateIn>

        {/* Risk Profile Card */}
        {riskProfile && (
          <AnimateIn from="bottom" delay={40}>
            <div
              className={`mb-6 border rounded-lg p-6 ${getRiskProfileBg(
                riskProfile.risk_profile
              )}`}
            >
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                투자자 성향 분석
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">위험 성향</p>
                  <p className={`font-semibold text-lg ${getRiskProfileColor(riskProfile.risk_profile)}`}>
                    {riskProfile.risk_profile === "aggressive"
                      ? "공격적"
                      : riskProfile.risk_profile === "moderate"
                      ? "중도적"
                      : "보수적"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">경험 수준</p>
                  <p className="font-semibold text-lg">
                    {riskProfile.experience_level === "expert"
                      ? "전문가"
                      : riskProfile.experience_level === "intermediate"
                      ? "중급"
                      : "초급"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">평균 ROI</p>
                  <p className={`font-semibold text-lg ${riskProfile.avg_roi > 0 ? "text-green-600" : "text-red-600"}`}>
                    {riskProfile.avg_roi.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Symbol Selection */}
        <AnimateIn from="bottom" delay={80}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">분석 심볼</label>
            <input
              type="text"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
              placeholder="QQQ"
              className="w-full md:w-48 px-3 py-2 bg-muted border border-border rounded-lg"
            />
          </div>
        </AnimateIn>

        {/* ML Predictions */}
        {predictions && (
          <AnimateIn from="bottom" delay={120}>
            <div className="mb-6 bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                ML 예측 분석
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">추천 진입가</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${predictions.entry_price?.toFixed(2) || "—"}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">추천 진출가</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${predictions.exit_price?.toFixed(2) || "—"}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">예측 신뢰도</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {predictions.confidence?.toFixed(0) || "—"}%
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                모델: {predictions.model_type}
              </p>
            </div>
          </AnimateIn>
        )}

        {/* Chart Patterns */}
        {patterns.length > 0 && (
          <AnimateIn from="bottom" delay={160}>
            <div className="mb-6 bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">감지된 차트 패턴</h3>
              <div className="space-y-3">
                {patterns.map((pattern, idx) => (
                  <div key={idx} className="flex items-start justify-between p-3 bg-muted/30 rounded">
                    <div>
                      <p className="font-semibold capitalize">
                        {pattern.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        신호: <span className="capitalize">{pattern.signal}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{pattern.confidence}% 신뢰도</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        )}

        {/* Market Anomalies */}
        {anomalies.length > 0 && (
          <AnimateIn from="bottom" delay={200}>
            <div className="mb-6 bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                시장 이상치 감지
              </h3>
              <div className="space-y-3">
                {anomalies.map((anomaly, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border ${
                      anomaly.severity === "high"
                        ? "bg-red-500/10 border-red-500/30"
                        : anomaly.severity === "medium"
                        ? "bg-yellow-500/10 border-yellow-500/30"
                        : "bg-blue-500/10 border-blue-500/30"
                    }`}
                  >
                    <p className="font-semibold capitalize">
                      {anomaly.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-sm text-muted-foreground">{anomaly.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        )}

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <AnimateIn from="bottom" delay={240}>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-4">AI 추천 신호 (Top 5)</h3>
              <div className="space-y-3">
                {recommendations.map((signal, idx) => (
                  <div key={idx} className="flex items-start justify-between p-4 bg-muted/30 rounded">
                    <div>
                      <p className="font-bold">{signal.symbol}</p>
                      <p className="text-sm text-muted-foreground">{signal.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        매칭 점수: {signal.matched_score?.toFixed(0) || signal.confidence_score}점
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="font-bold text-sm">
                          {(signal.matched_score || signal.confidence_score).toFixed(0)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">신뢰도</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        )}
      </div>
    </div>
  )
}
