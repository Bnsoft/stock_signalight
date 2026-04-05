"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Zap, Calendar, TrendingUp, DollarSign, AlertCircle } from "lucide-react"

interface NewsItem {
  id: number
  symbol: string
  title: string
  source: string
  url: string
  published_at: string
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL"
  content: string
  relevance_score: number
  news_type: string
}

interface EarningsEvent {
  symbol: string
  company_name: string
  earnings_date: string
  fiscal_quarter: string
  eps_estimate: number
  revenue_estimate: number
  previous_eps: number
  previous_revenue: number
  market_cap: number
  time: string
}

interface EconomicEvent {
  id: number
  event: string
  country: string
  date: string
  time: string
  forecast: string
  previous: string
  impact: "HIGH" | "MEDIUM" | "LOW"
  currency: string
}

interface IPO {
  id: number
  company: string
  symbol: string
  ipo_date: string
  price_range: string
  shares_offered: number
  expected_revenue: number
  industry: string
  lead_underwriter: string
}

type NewsTab = "news" | "earnings" | "economic" | "ipo" | "announcements"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function NewsEventsPage() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<NewsTab>("news")
  const [news, setNews] = useState<NewsItem[]>([])
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([])
  const [ipos, setIPOs] = useState<IPO[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSentiment, setSelectedSentiment] = useState<string>("ALL")
  const [selectedSymbol, setSelectedSymbol] = useState<string>("")

  useEffect(() => {
    if (!token) return
    fetchNewsData()
  }, [token, selectedSentiment, selectedSymbol])

  const fetchNewsData = async () => {
    setLoading(true)
    try {
      const [newsRes, earningsRes, economicRes, ipoRes] = await Promise.all([
        fetch(
          `${API_BASE}/api/news${selectedSymbol ? `?symbol=${selectedSymbol}` : ""}${
            selectedSentiment !== "ALL" ? `&sentiment=${selectedSentiment}` : ""
          }`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetch(`${API_BASE}/api/earnings-calendar`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/economic-calendar`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/ipo-calendar`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (newsRes.ok) {
        const data = await newsRes.json()
        setNews(data.news || data)
      }

      if (earningsRes.ok) {
        const data = await earningsRes.json()
        setEarnings(data.earnings || data)
      }

      if (economicRes.ok) {
        const data = await economicRes.json()
        setEconomicEvents(data.events || data)
      }

      if (ipoRes.ok) {
        const data = await ipoRes.json()
        setIPOs(data.ipos || data)
      }
    } catch (err) {
      console.error("Failed to fetch news data:", err)
    } finally {
      setLoading(false)
    }
  }

  const TabButton = ({ tab, label, icon: Icon }: { tab: NewsTab; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm ${
        activeTab === tab
          ? "bg-blue-600 text-white"
          : "bg-muted text-foreground hover:bg-muted/80"
      }`}
    >
      <Icon size={16} />
      <span className="font-medium">{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">뉴스 & 이벤트</h1>
            <p className="text-muted-foreground">
              시장 뉴스, 실적 일정, 경제 지표, IPO 정보
            </p>
          </div>
        </AnimateIn>

        {/* Tab Navigation */}
        <AnimateIn from="bottom" delay={80}>
          <div className="mb-8 bg-card border border-border rounded-lg p-4">
            <div className="flex gap-2 flex-wrap">
              <TabButton tab="news" label="뉴스" icon={Zap} />
              <TabButton tab="earnings" label="실적" icon={TrendingUp} />
              <TabButton tab="economic" label="경제" icon={AlertCircle} />
              <TabButton tab="ipo" label="IPO" icon={DollarSign} />
              <TabButton tab="announcements" label="공시" icon={Calendar} />
            </div>
          </div>
        </AnimateIn>

        {/* Content Area */}
        <AnimateIn from="bottom" delay={160}>
          <div>
            {loading ? (
              <div className="bg-card border border-border rounded-lg p-8 text-center animate-pulse">
                <p className="text-muted-foreground">데이터 로딩 중...</p>
              </div>
            ) : activeTab === "news" ? (
              <NewsView news={news} selectedSentiment={selectedSentiment} setSelectedSentiment={setSelectedSentiment} />
            ) : activeTab === "earnings" ? (
              <EarningsView earnings={earnings} />
            ) : activeTab === "economic" ? (
              <EconomicView events={economicEvents} />
            ) : activeTab === "ipo" ? (
              <IPOView ipos={ipos} />
            ) : activeTab === "announcements" ? (
              <AnnouncementsView symbol={selectedSymbol} setSymbol={setSelectedSymbol} />
            ) : null}
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}

function NewsView({
  news,
  selectedSentiment,
  setSelectedSentiment,
}: {
  news: NewsItem[]
  selectedSentiment: string
  setSelectedSentiment: (sentiment: string) => void
}) {
  return (
    <div className="space-y-6">
      {/* Sentiment Filter */}
      <div className="bg-card border border-border rounded-lg p-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedSentiment("ALL")}
          className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
            selectedSentiment === "ALL"
              ? "bg-blue-600 text-white"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setSelectedSentiment("POSITIVE")}
          className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
            selectedSentiment === "POSITIVE"
              ? "bg-green-600 text-white"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          긍정
        </button>
        <button
          onClick={() => setSelectedSentiment("NEGATIVE")}
          className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
            selectedSentiment === "NEGATIVE"
              ? "bg-red-600 text-white"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          부정
        </button>
        <button
          onClick={() => setSelectedSentiment("NEUTRAL")}
          className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
            selectedSentiment === "NEUTRAL"
              ? "bg-gray-600 text-white"
              : "bg-muted text-foreground hover:bg-muted/80"
          }`}
        >
          중립
        </button>
      </div>

      {/* News Feed */}
      <div className="space-y-4">
        {news.length > 0 ? (
          news.map((item) => (
            <div key={item.id} className="bg-card border border-border rounded-lg p-6 hover:border-blue-600 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-600/20 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                    {item.symbol}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    item.sentiment === "POSITIVE"
                      ? "bg-green-600/20 text-green-600"
                      : item.sentiment === "NEGATIVE"
                      ? "bg-red-600/20 text-red-600"
                      : "bg-gray-600/20 text-gray-600"
                  }`}>
                    {item.sentiment}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.published_at).toLocaleString("ko-KR")}
                </span>
              </div>

              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-muted-foreground mb-3 line-clamp-2">{item.content}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{item.source}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    신뢰도: {(item.relevance_score * 100).toFixed(0)}%
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    보기 →
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">뉴스가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EarningsView({ earnings }: { earnings: EarningsEvent[] }) {
  return (
    <div className="space-y-4">
      {earnings.length > 0 ? (
        earnings.map((earning, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold">{earning.symbol}</h3>
                  <span className="text-xs text-muted-foreground">{earning.company_name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{earning.fiscal_quarter}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{earning.earnings_date}</p>
                <p className="text-xs text-muted-foreground">{earning.time}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">EPS Estimate</p>
                <p className="text-lg font-bold">${earning.eps_estimate.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">이전: ${earning.previous_eps.toFixed(2)}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Revenue Estimate</p>
                <p className="text-lg font-bold">${(earning.revenue_estimate / 1e9).toFixed(1)}B</p>
                <p className="text-xs text-muted-foreground">이전: ${(earning.previous_revenue / 1e9).toFixed(1)}B</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">시가총액</p>
                <p className="text-lg font-bold">${(earning.market_cap / 1e12).toFixed(2)}T</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">EPS 증감</p>
                <p className={`text-lg font-bold ${
                  ((earning.eps_estimate - earning.previous_eps) / earning.previous_eps * 100) > 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}>
                  {(((earning.eps_estimate - earning.previous_eps) / earning.previous_eps) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">실적 일정이 없습니다</p>
        </div>
      )}
    </div>
  )
}

function EconomicView({ events }: { events: EconomicEvent[] }) {
  return (
    <div className="space-y-4">
      {events.length > 0 ? (
        events.map((event) => (
          <div
            key={event.id}
            className={`bg-card border rounded-lg p-6 ${
              event.impact === "HIGH"
                ? "border-red-600"
                : event.impact === "MEDIUM"
                ? "border-yellow-600"
                : "border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold">{event.event}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    event.impact === "HIGH"
                      ? "bg-red-600/20 text-red-600"
                      : event.impact === "MEDIUM"
                      ? "bg-yellow-600/20 text-yellow-600"
                      : "bg-green-600/20 text-green-600"
                  }`}>
                    {event.impact} 영향
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{event.country}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{event.date}</p>
                <p className="text-xs text-muted-foreground">{event.time}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">예상치</p>
                <p className="text-lg font-bold">{event.forecast}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">이전 값</p>
                <p className="text-lg font-bold">{event.previous}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">통화</p>
                <p className="text-lg font-bold">{event.currency}</p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">경제 이벤트가 없습니다</p>
        </div>
      )}
    </div>
  )
}

function IPOView({ ipos }: { ipos: IPO[] }) {
  return (
    <div className="space-y-4">
      {ipos.length > 0 ? (
        ipos.map((ipo) => (
          <div key={ipo.id} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold">{ipo.company}</h3>
                  <span className="bg-blue-600/20 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                    {ipo.symbol}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{ipo.industry}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{ipo.ipo_date}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">공모가</p>
                <p className="text-lg font-bold">{ipo.price_range}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">주식 수</p>
                <p className="text-lg font-bold">{(ipo.shares_offered / 1e6).toFixed(0)}M</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">예상 수익</p>
                <p className="text-lg font-bold">${(ipo.expected_revenue / 1e6).toFixed(0)}M</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">주관사</p>
                <p className="text-sm font-bold">{ipo.lead_underwriter}</p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">예정된 IPO가 없습니다</p>
        </div>
      )}
    </div>
  )
}

function AnnouncementsView({ symbol, setSymbol }: { symbol: string; setSymbol: (s: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-4">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="종목 입력 (예: AAPL)"
          className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground"
        />
      </div>

      <div className="space-y-4">
        {symbol ? (
          <>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-2">분기 보고서 (10-Q)</h3>
              <p className="text-sm text-muted-foreground mb-4">최근 공시일: 2일 전</p>
              <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold">
                SEC EDGAR에서 보기 →
              </a>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-2">배당금 공시</h3>
              <p className="text-sm text-muted-foreground mb-2">$0.25 per share</p>
              <p className="text-sm text-muted-foreground">지급일: 2024-06-15</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold mb-2">주식 분할</h3>
              <p className="text-sm text-muted-foreground mb-2">3-for-1 split</p>
              <p className="text-sm text-muted-foreground">효력 발생: 2024-07-01</p>
            </div>
          </>
        ) : (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">종목을 입력하여 공시를 확인하세요</p>
          </div>
        )}
      </div>
    </div>
  )
}
