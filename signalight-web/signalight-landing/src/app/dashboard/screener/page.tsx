"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Zap,
  Save,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { usePagination } from "@/hooks/usePagination"
import { ToastContainer } from "@/components/ToastContainer"
import { Pagination } from "@/components/Pagination"

interface StockResult {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: string
  rsi?: number
  macd?: number
  bollingerPosition?: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const screenerStrategies = [
  { id: "gainers", label: "상승 종목", icon: TrendingUp },
  { id: "losers", label: "하락 종목", icon: TrendingDown },
  { id: "rsi", label: "RSI 스크리닝", icon: Zap },
  { id: "macd", label: "MACD 교차", icon: Zap },
  { id: "volume", label: "거래량 급증", icon: Zap },
  { id: "ma-cross", label: "MA 교차", icon: Zap },
]

export default function ScreenerPage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()
  const pagination = usePagination(20)

  const [selectedStrategy, setSelectedStrategy] = useState("gainers")
  const [results, setResults] = useState<StockResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    minVolume: "",
    minMarketCap: "",
  })
  const [showFilters, setShowFilters] = useState(false)

  const handleRunScreener = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (filters.minPrice) params.append("min_price", filters.minPrice)
      if (filters.maxPrice) params.append("max_price", filters.maxPrice)
      if (filters.minVolume) params.append("min_volume", filters.minVolume)
      if (filters.minMarketCap) params.append("min_market_cap", filters.minMarketCap)

      const response = await fetch(
        `${API_BASE}/api/screener/${selectedStrategy}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error("Failed to run screener")

      const data = await response.json()
      const stocks: StockResult[] = data.data || []

      pagination.setTotal(stocks.length)
      setResults(stocks)
      success(`${stocks.length}개의 종목을 찾았습니다`)
    } catch (err) {
      showError("스크리닝에 실패했습니다")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const displayResults = results.slice(pagination.startIndex, pagination.endIndex)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">주식 스크리너</h1>
            <p className="text-muted-foreground">
              다양한 조건으로 주식을 스크리닝하세요
            </p>
          </div>
        </AnimateIn>

        {/* 스크리닝 전략 선택 */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">스크리닝 전략</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
              {screenerStrategies.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelectedStrategy(id)}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center flex-col gap-2 ${
                    selectedStrategy === id
                      ? "border-blue-600 bg-blue-600/10"
                      : "border-border hover:border-blue-600"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-semibold text-center">{label}</span>
                </button>
              ))}
            </div>

            {/* 필터 토글 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm mb-4"
            >
              <Filter size={16} />
              {showFilters ? "필터 숨기기" : "필터 설정"}
            </button>

            {/* 필터 */}
            {showFilters && (
              <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-muted-foreground">
                    최소 가격
                  </label>
                  <input
                    type="number"
                    placeholder="$"
                    value={filters.minPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, minPrice: e.target.value })
                    }
                    step="0.01"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-muted-foreground">
                    최대 가격
                  </label>
                  <input
                    type="number"
                    placeholder="$"
                    value={filters.maxPrice}
                    onChange={(e) =>
                      setFilters({ ...filters, maxPrice: e.target.value })
                    }
                    step="0.01"
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-muted-foreground">
                    최소 거래량 (M)
                  </label>
                  <input
                    type="number"
                    placeholder="백만"
                    value={filters.minVolume}
                    onChange={(e) =>
                      setFilters({ ...filters, minVolume: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-muted-foreground">
                    최소 시가총액 (B)
                  </label>
                  <input
                    type="number"
                    placeholder="십억"
                    value={filters.minMarketCap}
                    onChange={(e) =>
                      setFilters({ ...filters, minMarketCap: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground text-sm"
                  />
                </div>
              </div>
            )}

            {/* 실행 버튼 */}
            <button
              onClick={handleRunScreener}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Search size={18} />
              {loading ? "스크리닝 중..." : "스크리닝 실행"}
            </button>
          </div>
        </AnimateIn>

        {/* 결과 */}
        <AnimateIn from="bottom" delay={160}>
          {results.length > 0 && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-bold">
                  스크리닝 결과 ({results.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        종목
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">
                        가격
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">
                        변화
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">
                        거래량
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold">
                        시가총액
                      </th>
                      {selectedStrategy === "rsi" && (
                        <th className="px-6 py-3 text-right text-sm font-semibold">
                          RSI
                        </th>
                      )}
                      {selectedStrategy === "macd" && (
                        <th className="px-6 py-3 text-right text-sm font-semibold">
                          MACD
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayResults.map((stock) => (
                      <tr
                        key={stock.symbol}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold">{stock.symbol}</p>
                            <p className="text-sm text-muted-foreground">
                              {stock.name}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold">
                          ${stock.price.toFixed(2)}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-semibold ${
                            stock.changePercent >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {stock.changePercent >= 0 ? "+" : ""}
                          {stock.changePercent.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(stock.volume / 1000000).toFixed(1)}M
                        </td>
                        <td className="px-6 py-4 text-right">
                          {stock.marketCap}
                        </td>
                        {selectedStrategy === "rsi" && (
                          <td className="px-6 py-4 text-right">
                            {stock.rsi ? stock.rsi.toFixed(2) : "-"}
                          </td>
                        )}
                        {selectedStrategy === "macd" && (
                          <td className="px-6 py-4 text-right">
                            {stock.macd ? stock.macd.toFixed(4) : "-"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {results.length > pagination.pageSize && (
                <div className="p-6 border-t border-border">
                  <Pagination
                    state={pagination}
                    pageRange={pagination.pageRange}
                    hasNextPage={pagination.hasNextPage}
                    hasPrevPage={pagination.hasPrevPage}
                    onPreviousPage={pagination.prevPage}
                    onNextPage={pagination.nextPage}
                    onGoToPage={pagination.goToPage}
                    onChangePageSize={pagination.changePageSize}
                  />
                </div>
              )}
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <Search className="mx-auto mb-4 text-muted-foreground" size={32} />
              <p className="text-muted-foreground">
                스크리닝을 실행하여 결과를 확인하세요
              </p>
            </div>
          )}
        </AnimateIn>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
