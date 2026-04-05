"use client"

import { useState, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Search, Filter, Clock, Bookmark, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { ToastContainer } from "@/components/ToastContainer"

interface SearchResult {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: string
}

interface SearchQuery {
  symbol: string
  name: string
  priceMin: string
  priceMax: string
  volumeMin: string
  marketCapMin: string
  marketCapMax: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function SearchPage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    symbol: "",
    name: "",
    priceMin: "",
    priceMax: "",
    volumeMin: "",
    marketCapMin: "",
    marketCapMax: "",
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>(["AAPL", "MSFT", "GOOGL", "TSLA"])
  const [savedSearches, setSavedSearches] = useState<{ name: string; query: SearchQuery }[]>([
    {
      name: "고가 마켓캡",
      query: { symbol: "", name: "", priceMin: "", priceMax: "", volumeMin: "", marketCapMin: "100B", marketCapMax: "" },
    },
  ])
  const [showFilters, setShowFilters] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.symbol && !searchQuery.name) {
      showError("검색어를 입력하세요")
      return
    }

    setLoading(true)
    try {
      // Mock API call
      const mockResults: SearchResult[] = [
        {
          symbol: "AAPL",
          name: "Apple Inc.",
          price: 175.45,
          change: 2.35,
          changePercent: 1.36,
          volume: 52500000,
          marketCap: "2.7T",
        },
        {
          symbol: "MSFT",
          name: "Microsoft Corporation",
          price: 380.25,
          change: -1.25,
          changePercent: -0.33,
          volume: 21200000,
          marketCap: "2.84T",
        },
        {
          symbol: "GOOGL",
          name: "Alphabet Inc.",
          price: 140.50,
          change: 3.15,
          changePercent: 2.29,
          volume: 28900000,
          marketCap: "1.84T",
        },
      ]

      setResults(mockResults)
      setSearchHistory([searchQuery.symbol || searchQuery.name, ...searchHistory.slice(0, 4)])
      success(`${mockResults.length}개 종목을 찾았습니다`)
    } catch (err) {
      showError("검색 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSearch = () => {
    const name = prompt("검색 이름:")
    if (name) {
      setSavedSearches([...savedSearches, { name, query: searchQuery }])
      success("검색이 저장되었습니다")
    }
  }

  const loadSavedSearch = (query: SearchQuery) => {
    setSearchQuery(query)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">종목 검색</h1>
            <p className="text-muted-foreground">고급 필터로 종목을 검색하세요</p>
          </div>
        </AnimateIn>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 메인 검색 */}
          <AnimateIn from="bottom" delay={80} className="lg:col-span-3">
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">종목 검색</label>
                  <div className="flex gap-2">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="심볼 또는 회사명 (예: AAPL, Apple)"
                      value={searchQuery.symbol}
                      onChange={(e) => setSearchQuery({ ...searchQuery, symbol: e.target.value })}
                      className="flex-1 px-4 py-3 bg-muted border border-border rounded-lg text-foreground"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white font-bold rounded-lg transition-all flex items-center gap-2"
                    >
                      <Search size={18} />
                      {loading ? "검색 중..." : "검색"}
                    </button>
                  </div>
                </div>

                {/* 필터 토글 */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  <Filter size={16} />
                  {showFilters ? "필터 숨기기" : "고급 필터"}
                </button>

                {/* 고급 필터 */}
                {showFilters && (
                  <div className="border-t border-border pt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-muted-foreground">최소 가격</label>
                      <input
                        type="number"
                        placeholder="$"
                        value={searchQuery.priceMin}
                        onChange={(e) => setSearchQuery({ ...searchQuery, priceMin: e.target.value })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-muted-foreground">최대 가격</label>
                      <input
                        type="number"
                        placeholder="$"
                        value={searchQuery.priceMax}
                        onChange={(e) => setSearchQuery({ ...searchQuery, priceMax: e.target.value })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-muted-foreground">최소 거래량</label>
                      <input
                        type="text"
                        placeholder="M (백만)"
                        value={searchQuery.volumeMin}
                        onChange={(e) => setSearchQuery({ ...searchQuery, volumeMin: e.target.value })}
                        className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground text-sm"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* 검색 결과 */}
            {results.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h2 className="text-lg font-bold">검색 결과 ({results.length})</h2>
                </div>
                <div className="divide-y divide-border">
                  {results.map((result) => (
                    <div key={result.symbol} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{result.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{result.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${result.price.toFixed(2)}</p>
                          <p className={`text-sm font-semibold ${result.changePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {result.changePercent >= 0 ? "+" : ""}{result.changePercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">거래량: </span>
                          <span className="font-semibold">{(result.volume / 1000000).toFixed(1)}M</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">시가총액: </span>
                          <span className="font-semibold">{result.marketCap}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && results.length === 0 && searchQuery.symbol && (
              <div className="bg-blue-600/10 border border-blue-600 rounded-lg p-8 text-center">
                <Search className="mx-auto mb-4 text-blue-600" size={32} />
                <p className="text-muted-foreground">검색 결과가 없습니다</p>
              </div>
            )}
          </AnimateIn>

          {/* 사이드바 */}
          <AnimateIn from="bottom" delay={160}>
            <div className="space-y-6">
              {/* 최근 검색 */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={18} />
                  <h3 className="font-bold">최근 검색</h3>
                </div>
                <div className="space-y-2">
                  {searchHistory.map((symbol, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery({ ...searchQuery, symbol })
                        searchInputRef.current?.focus()
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-semibold transition-all"
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>

              {/* 저장된 검색 */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bookmark size={18} />
                    <h3 className="font-bold">저장된 검색</h3>
                  </div>
                  <button
                    onClick={handleSaveSearch}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                  >
                    저장
                  </button>
                </div>
                <div className="space-y-2">
                  {savedSearches.map((saved, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadSavedSearch(saved.query)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-semibold transition-all"
                    >
                      {saved.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 팁 */}
              <div className="bg-yellow-600/10 border border-yellow-600 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-700 mb-1">검색 팁</p>
                    <p className="text-yellow-600 text-xs">심볼(AAPL) 또는 회사명으로 검색하세요. 고급 필터를 사용하면 더 정확한 결과를 얻을 수 있습니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
