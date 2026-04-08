"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { AlertCircle, Eye } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { usePagination } from "@/hooks/usePagination"
import { ToastContainer } from "@/components/ToastContainer"
import { Pagination } from "@/components/Pagination"

interface OptionChain {
  strikePrice: number
  callBid: number
  callAsk: number
  callIv: number
  callDelta: number
  putBid: number
  putAsk: number
  putIv: number
  putDelta: number
}

interface OptionAnalysis {
  symbol: string
  price: number
  expirationDates: string[]
  iv: number
  ivPercentile: number
  chain: OptionChain[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function OptionsPage() {
  const { token } = useAuth()
  const { toasts, removeToast, success, error: showError } = useToast()
  const pagination = usePagination(15)

  const [symbol, setSymbol] = useState("AAPL")
  const [analysis, setAnalysis] = useState<OptionAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedExpiration, setSelectedExpiration] = useState("")
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadOptionChain()
  }, [symbol])

  useEffect(() => {
    if (analysis && analysis.expirationDates.length > 0 && !selectedExpiration) {
      setSelectedExpiration(analysis.expirationDates[0])
    }
  }, [analysis])

  useEffect(() => {
    if (analysis) {
      pagination.setTotal(analysis.chain.length)
    }
  }, [analysis])

  const loadOptionChain = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE}/api/options/chain/${symbol}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error("Failed to load option chain")

      const data = await response.json()
      setAnalysis(data.data)
    } catch (err) {
      showError("옵션 데이터를 로드할 수 없습니다")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const displayChain = analysis
    ? analysis.chain.slice(pagination.startIndex, pagination.endIndex)
    : []

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">옵션 분석</h1>
            <p className="text-muted-foreground">옵션 체인, 그릭스, IV 분석</p>
          </div>
        </AnimateIn>

        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2">종목 심볼</label>
                <input
                  type="text"
                  placeholder="예: AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                />
              </div>

              {analysis && analysis.expirationDates.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold mb-2">만료일</label>
                  <select
                    value={selectedExpiration}
                    onChange={(e) => setSelectedExpiration(e.target.value)}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                  >
                    {analysis.expirationDates.map((date) => (
                      <option key={date} value={date}>
                        {date}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-end">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  <Eye size={16} />
                  {showDetails ? "숨기기" : "상세보기"}
                </button>
              </div>
            </div>
          </div>
        </AnimateIn>

        {analysis && (
          <AnimateIn from="bottom" delay={160}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-2">현재가</p>
                <p className="text-3xl font-bold">${analysis.price.toFixed(2)}</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-2">내재 변동성</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {analysis.iv.toFixed(2)}%
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-sm text-muted-foreground mb-2">IV 백분위</p>
                <p className="text-3xl font-bold text-blue-600">
                  {analysis.ivPercentile.toFixed(0)}th
                </p>
              </div>
            </div>
          </AnimateIn>
        )}

        <AnimateIn from="bottom" delay={240}>
          {analysis && analysis.chain.length > 0 ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-bold">옵션 체인</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">행사가</th>
                      <th className="px-4 py-3 text-center font-semibold">콜 비드</th>
                      <th className="px-4 py-3 text-center font-semibold">콜 애스크</th>
                      {showDetails && (
                        <>
                          <th className="px-4 py-3 text-center font-semibold">IV</th>
                          <th className="px-4 py-3 text-center font-semibold">Δ</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-center font-semibold">풋 비드</th>
                      <th className="px-4 py-3 text-center font-semibold">풋 애스크</th>
                      {showDetails && (
                        <>
                          <th className="px-4 py-3 text-center font-semibold">IV</th>
                          <th className="px-4 py-3 text-center font-semibold">Δ</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {displayChain.map((option) => (
                      <tr
                        key={option.strikePrice}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-bold">
                          ${option.strikePrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-green-600">
                          ${option.callBid.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-red-600">
                          ${option.callAsk.toFixed(2)}
                        </td>
                        {showDetails && (
                          <>
                            <td className="px-4 py-3 text-center text-xs">
                              {option.callIv.toFixed(2)}%
                            </td>
                            <td className="px-4 py-3 text-center text-xs">
                              {option.callDelta.toFixed(2)}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 text-center text-green-600">
                          ${option.putBid.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center text-red-600">
                          ${option.putAsk.toFixed(2)}
                        </td>
                        {showDetails && (
                          <>
                            <td className="px-4 py-3 text-center text-xs">
                              {option.putIv.toFixed(2)}%
                            </td>
                            <td className="px-4 py-3 text-center text-xs">
                              {option.putDelta.toFixed(2)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {analysis.chain.length > pagination.pageSize && (
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
          ) : loading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <AlertCircle className="mx-auto mb-4 text-muted-foreground" size={32} />
              <p className="text-muted-foreground">옵션 데이터를 로드할 수 없습니다</p>
            </div>
          )}
        </AnimateIn>

        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  )
}
