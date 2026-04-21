"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { TrendingUp, ArrowRight } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/calculator"

interface BacktestResult {
  id: number; symbol: string; start_date: string; end_date: string
  initial_capital: number; final_capital: number; total_trades: number
  winning_trades: number; losing_trades: number; win_rate_percent: number
  total_roi_percent: number; max_drawdown_percent: number; created_at: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const cardCls = "bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-6 shadow-[rgba(0,0,0,0.05)_0px_4px_24px]"
const tooltipStyle = { backgroundColor: "#faf9f5", border: "1px solid #f0eee6", borderRadius: "8px", color: "#141413", fontSize: "12px" }

export default function BacktestCalculatorPage() {
  const { token } = useAuth()
  const [backtest, setBacktest] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(`${API_BASE}/api/backtest/results?limit=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.results?.length) setBacktest(d.results[0]) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [token])

  const equityCurve = backtest ? Array.from({ length: 91 }, (_, i) => ({
    day: i,
    equity: backtest.initial_capital * Math.pow((backtest.final_capital / backtest.initial_capital) ** (1 / 90), i)
  })) : []

  if (loading) return (
    <div className="min-h-screen bg-[#f5f4ed] p-8 flex items-center justify-center">
      <p className="text-[#87867f]">로딩 중...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f4ed] p-8">
      <div className="max-w-5xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-medium text-[#141413] leading-tight mb-1" style={{ fontFamily: "Georgia, serif" }}>
              백테스트 계산기
            </h1>
            <p className="text-[#87867f] text-sm">과거 성과를 기반으로 미래 수익을 예측합니다</p>
          </div>
        </AnimateIn>

        {!backtest ? (
          <AnimateIn from="bottom" delay={60}>
            <div className={`${cardCls} text-center py-16`}>
              <div className="w-12 h-12 bg-[#e8e6dc] rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={22} className="text-[#87867f]" />
              </div>
              <h3 className="text-lg font-medium text-[#141413] mb-2" style={{ fontFamily: "Georgia, serif" }}>
                백테스트 결과 없음
              </h3>
              <p className="text-[#87867f] text-sm mb-6">먼저 백테스트를 실행해 주세요</p>
              <Link href="/dashboard/calculator"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c96442] text-[#faf9f5] rounded-xl text-sm font-medium hover:bg-[#b8573b] transition-colors">
                계산기로 이동 <ArrowRight size={14} />
              </Link>
            </div>
          </AnimateIn>
        ) : (
          <>
            {/* Summary */}
            <AnimateIn from="bottom" delay={60}>
              <div className={`${cardCls} mb-5`}>
                <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-4">결과 요약</p>
                <div className="grid grid-cols-3 gap-6 mb-5">
                  {[
                    { label: "심볼", value: backtest.symbol, color: "text-[#141413]" },
                    { label: "총 ROI", value: `${backtest.total_roi_percent.toFixed(2)}%`, color: "text-[#2d6a4f]" },
                    { label: "승률", value: `${backtest.win_rate_percent.toFixed(1)}%`, color: "text-[#c96442]" },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs text-[#87867f] mb-1">{item.label}</p>
                      <p className={`text-2xl font-medium ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-4 pt-5 border-t border-[#f0eee6]">
                  {[
                    { label: "초기 자본", value: formatCurrency(backtest.initial_capital) },
                    { label: "최종 자본", value: formatCurrency(backtest.final_capital) },
                    { label: "총 거래", value: String(backtest.total_trades) },
                    { label: "최대 낙폭", value: `${backtest.max_drawdown_percent.toFixed(2)}%` },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs text-[#87867f] mb-1">{item.label}</p>
                      <p className="text-sm font-medium text-[#141413]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>

            {/* Chart */}
            <AnimateIn from="bottom" delay={120}>
              <div className={`${cardCls} mb-5`}>
                <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-4">수익 곡선 (90일)</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0eee6" />
                      <XAxis dataKey="day" stroke="#87867f" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#87867f" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={v => formatCurrency(Number(v))} />
                      <Legend />
                      <Line type="monotone" dataKey="equity" stroke="#c96442" dot={false} name="자산 가치" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </AnimateIn>

            {/* Stats + CTA */}
            <AnimateIn from="bottom" delay={180}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className={`${cardCls} lg:col-span-2`}>
                  <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-4">거래 통계</p>
                  <div className="space-y-2">
                    {[
                      { label: "승리 거래", value: backtest.winning_trades, color: "text-[#2d6a4f]" },
                      { label: "패배 거래", value: backtest.losing_trades, color: "text-[#b53333]" },
                      { label: "승률", value: `${backtest.win_rate_percent.toFixed(1)}%`, color: "text-[#141413]" },
                      { label: "기간", value: `${new Date(backtest.start_date).toLocaleDateString("ko-KR")} — ${new Date(backtest.end_date).toLocaleDateString("ko-KR")}`, color: "text-[#141413]" },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center px-4 py-2.5 bg-[#f5f4ed] rounded-xl">
                        <span className="text-sm text-[#5e5d59]">{item.label}</span>
                        <span className={`text-sm font-medium ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={cardCls}>
                  <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-3">계산기에서 활용</p>
                  <p className="text-sm text-[#5e5d59] mb-5 leading-relaxed">
                    이 백테스트의 {backtest.total_roi_percent.toFixed(2)}% ROI를 기반으로 미래 수익을 시뮬레이션합니다
                  </p>
                  <Link
                    href={`/dashboard/calculator?roi=${backtest.total_roi_percent}&period=90&principal=10000`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#c96442] text-[#faf9f5] rounded-xl text-sm font-medium hover:bg-[#b8573b] transition-colors"
                  >
                    <TrendingUp size={15} /> 계산기 열기
                  </Link>
                </div>
              </div>
            </AnimateIn>

            <AnimateIn from="bottom" delay={240}>
              <div className="mt-6 px-5 py-4 bg-[#faf9f5] border border-[#f0eee6] rounded-xl text-xs text-[#87867f] leading-relaxed">
                과거 성과는 미래 결과를 보장하지 않습니다. 다양한 시장 상황과 세금 전략을 고려해 수익을 분석하세요.
              </div>
            </AnimateIn>
          </>
        )}
      </div>
    </div>
  )
}
