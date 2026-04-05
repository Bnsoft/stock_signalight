"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Newspaper, Calendar, TrendingUp, Eye, AlertCircle, BarChart3 } from "lucide-react"

interface NewsItem {
  id: number
  source: string
  title: string
  url: string
  summary: string
  sentiment: string
  published_at: string
}

interface EconomicEvent {
  id: number
  event_name: string
  country: string
  scheduled_time: string
  previous_value: number
  forecast_value: number
  actual_value?: number
  impact: string
}

interface EarningsEvent {
  id: number
  symbol: string
  company_name: string
  earnings_date: string
  eps_estimate: number
  revenue_estimate: number
  report_time?: string
}

interface MarketSentiment {
  vix: { value: number; interpretation: string }
  put_call_ratio: { value: number; interpretation: string }
  fear_greed_index: { value: number; label: string }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function NewsPage() {
  const { user, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([])
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([])
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([])
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState("QQQ")

  useEffect(() => {
    if (!token) return

    const fetchNewsData = async () => {
      try {
        // Fetch news feed
        const newsRes = await fetch(`${API_BASE}/api/news-feed?limit=15`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (newsRes.ok) {
          const data = await newsRes.json()
          setNewsFeed(data.news)
        }

        // Fetch economic calendar
        const econRes = await fetch(`${API_BASE}/api/economic-calendar?days_ahead=30`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (econRes.ok) {
          const data = await econRes.json()
          setEconomicEvents(data.events.slice(0, 10))
        }

        // Fetch earnings calendar
        const earningsRes = await fetch(`${API_BASE}/api/earnings-calendar?days_ahead=30`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (earningsRes.ok) {
          const data = await earningsRes.json()
          setEarningsEvents(data.earnings.slice(0, 10))
        }

        // Fetch market sentiment
        const sentimentRes = await fetch(`${API_BASE}/api/market-sentiment`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (sentimentRes.ok) {
          const data = await sentimentRes.json()
          setSentiment(data.sentiment)
        }
      } catch (err) {
        console.error("Failed to load news data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchNewsData()
  }, [token])

  if (loading) {
    return <div className="min-h-screen bg-background p-6 animate-pulse" />
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "border-green-500/50 bg-green-500/10"
      case "negative":
        return "border-red-500/50 bg-red-500/10"
      default:
        return "border-yellow-500/50 bg-yellow-500/10"
    }
  }

  const getImpactBg = (impact: string) => {
    switch (impact) {
      case "HIGH":
        return "bg-red-500/10 border-red-500/30"
      case "MEDIUM":
        return "bg-yellow-500/10 border-yellow-500/30"
      default:
        return "bg-blue-500/10 border-blue-500/30"
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Newspaper className="w-8 h-8 text-blue-500" />
              뉴스 & 경제지표
            </h1>
            <p className="text-muted-foreground">
              실시간 뉴스, 경제 캘린더, 시장 센티멘트 추적
            </p>
          </div>
        </AnimateIn>

        {/* Market Sentiment */}
        {sentiment && (
          <AnimateIn from="bottom" delay={40}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* VIX */}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">공포지수 (VIX)</p>
                <p className="text-3xl font-bold">{sentiment.vix.value.toFixed(1)}</p>
                <p className={`text-xs mt-2 ${
                  sentiment.vix.interpretation === "extreme"
                    ? "text-red-600"
                    : sentiment.vix.interpretation === "elevated"
                    ? "text-orange-600"
                    : "text-green-600"
                }`}>
                  {sentiment.vix.interpretation === "extreme"
                    ? "극도의 공포"
                    : sentiment.vix.interpretation === "elevated"
                    ? "높은 공포"
                    : "정상"}
                </p>
              </div>

              {/* Put/Call Ratio */}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Put/Call 비율</p>
                <p className="text-3xl font-bold">{sentiment.put_call_ratio.value.toFixed(2)}</p>
                <p className={`text-xs mt-2 ${
                  sentiment.put_call_ratio.interpretation.includes("bearish")
                    ? "text-red-600"
                    : "text-green-600"
                }`}>
                  {sentiment.put_call_ratio.interpretation === "slightly_bearish"
                    ? "약간 약세"
                    : "약간 강세"}
                </p>
              </div>

              {/* Fear & Greed Index */}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Fear & Greed 지수</p>
                <p className="text-3xl font-bold">{sentiment.fear_greed_index.value}</p>
                <p className="text-xs text-yellow-600 mt-2">
                  {sentiment.fear_greed_index.label === "neutral"
                    ? "중립"
                    : sentiment.fear_greed_index.label.includes("fear")
                    ? "공포"
                    : "탐욕"}
                </p>
              </div>

              {/* Market Breadth */}
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">시장 광폭성</p>
                <div className="flex items-center gap-2">
                  <div className="text-green-600 font-bold">↑2100</div>
                  <div className="text-red-600 font-bold">↓900</div>
                </div>
                <p className="text-xs text-green-600 mt-2">강세 추세</p>
              </div>
            </div>
          </AnimateIn>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: News Feed */}
          <div className="lg:col-span-2">
            {/* News Feed */}
            <AnimateIn from="bottom" delay={80}>
              <div className="bg-card border border-border rounded-lg p-6 mb-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Newspaper className="w-5 h-5" />
                  최근 뉴스
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {newsFeed.map((news, idx) => (
                    <a
                      key={idx}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block p-3 rounded border transition-all hover:border-primary ${getSentimentColor(
                        news.sentiment
                      )}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-sm line-clamp-1">
                          {news.title}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          news.sentiment === "positive"
                            ? "bg-green-500/20 text-green-600"
                            : news.sentiment === "negative"
                            ? "bg-red-500/20 text-red-600"
                            : "bg-yellow-500/20 text-yellow-600"
                        }`}>
                          {news.sentiment === "positive"
                            ? "긍정"
                            : news.sentiment === "negative"
                            ? "부정"
                            : "중립"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {news.summary}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {news.source} • {new Date(news.published_at).toLocaleDateString("ko-KR")}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            </AnimateIn>

            {/* Economic Calendar */}
            <AnimateIn from="bottom" delay={120}>
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  경제 달력 (7일)
                </h2>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {economicEvents.map((event, idx) => (
                    <div key={idx} className={`p-3 rounded border ${getImpactBg(event.impact)}`}>
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-semibold text-sm">{event.event_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.country}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          event.impact === "HIGH"
                            ? "bg-red-500/20 text-red-600"
                            : event.impact === "MEDIUM"
                            ? "bg-yellow-500/20 text-yellow-600"
                            : "bg-blue-500/20 text-blue-600"
                        }`}>
                          {event.impact === "HIGH"
                            ? "높음"
                            : event.impact === "MEDIUM"
                            ? "중간"
                            : "낮음"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>예상: {event.forecast_value}</span>
                        {event.actual_value && (
                          <span>
                            {" "}
                            • 실제: {event.actual_value}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.scheduled_time).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* Right Column: Earnings & Related Assets */}
          <div>
            {/* Earnings Calendar */}
            <AnimateIn from="bottom" delay={160}>
              <div className="bg-card border border-border rounded-lg p-6 mb-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  실적 발표 (7일)
                </h2>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {earningsEvents.map((event, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded border border-border">
                      <p className="font-semibold text-sm">{event.symbol}</p>
                      <p className="text-xs text-muted-foreground mb-1">
                        {event.company_name}
                      </p>
                      <div className="text-xs mb-2">
                        <p>EPS 예상: {event.eps_estimate}</p>
                        <p>매출 예상: ${(event.revenue_estimate / 1e9).toFixed(1)}B</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.earnings_date).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>

            {/* Related Assets */}
            <AnimateIn from="bottom" delay={200}>
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  연관 자산
                </h2>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="font-semibold text-sm mb-1">원유 (WTI)</p>
                    <p className="text-2xl font-bold text-blue-600">$78.50</p>
                    <p className="text-xs text-green-600 mt-1">+2.3%</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="font-semibold text-sm mb-1">금</p>
                    <p className="text-2xl font-bold text-yellow-600">$2,085.50</p>
                    <p className="text-xs text-green-600 mt-1">+0.8%</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="font-semibold text-sm mb-1">달러지수</p>
                    <p className="text-2xl font-bold text-red-600">104.2</p>
                    <p className="text-xs text-red-600 mt-1">-0.5%</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="font-semibold text-sm mb-1">비트코인</p>
                    <p className="text-2xl font-bold text-orange-600">$68,500</p>
                    <p className="text-xs text-green-600 mt-1">+5.2%</p>
                  </div>
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </div>
    </div>
  )
}
