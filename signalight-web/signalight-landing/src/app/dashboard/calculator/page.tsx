"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { ShareCalculationDialog } from "@/components/dashboard/ShareCalculationDialog"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { calculateProfit, generateScenarios, TAX_BRACKETS, formatCurrency, type CalculationInput, type CalculationResult } from "@/lib/calculator"
import { Save, Copy, Share2 } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const inputCls = "w-full px-4 py-2.5 bg-white border border-[#f0eee6] rounded-xl text-sm text-[#141413] focus:outline-none focus:border-[#3898ec] focus:ring-1 focus:ring-[#3898ec] transition-colors"
const labelCls = "block text-xs font-medium text-[#87867f] mb-1.5 uppercase tracking-wide"
const cardCls = "bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-6 shadow-[rgba(0,0,0,0.05)_0px_4px_24px]"

export default function CalculatorPage() {
  const { user, token } = useAuth()
  const [principal, setPrincipal] = useState(10000)
  const [periodMonths, setPeriodMonths] = useState(12)
  const [targetROI, setTargetROI] = useState(15)
  const [isCompound, setIsCompound] = useState(true)
  const [taxBracket, setTaxBracket] = useState("us_capital_gains_long")
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [scenarios, setScenarios] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  const selectedTaxRate = TAX_BRACKETS[taxBracket]?.longTerm || 0

  useEffect(() => {
    const input: CalculationInput = { principal, periodMonths, targetROI, isCompound, taxRate: selectedTaxRate * 100 }
    setResult(calculateProfit(input))
    setScenarios(generateScenarios(principal, periodMonths, selectedTaxRate * 100, isCompound))
  }, [principal, periodMonths, targetROI, isCompound, taxBracket, selectedTaxRate])

  const handleSave = async () => {
    if (!user?.user_id || !result) return
    setSaving(true)
    try {
      await fetch(`${API_BASE}/api/calculate?user_id=${user.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ principal, period_months: periodMonths, target_roi: targetROI, is_compound: isCompound, tax_rate: selectedTaxRate * 100 }),
      })
      setMessage("저장되었습니다")
      setTimeout(() => setMessage(""), 3000)
    } catch { setMessage("저장 실패") } finally { setSaving(false) }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`원금: ${formatCurrency(principal)}\n기간: ${periodMonths}개월\nROI: ${targetROI}%\n최종금액: ${formatCurrency(result?.finalValue || 0)}\n순수익: ${formatCurrency(result?.netProfit || 0)}`)
    setMessage("복사되었습니다")
    setTimeout(() => setMessage(""), 2000)
  }

  const chartTooltipStyle = { backgroundColor: "#faf9f5", border: "1px solid #f0eee6", borderRadius: "8px", color: "#141413", fontSize: "12px" }

  return (
    <div className="min-h-screen bg-[#f5f4ed] p-8">
      <div className="max-w-6xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-medium text-[#141413] leading-tight mb-1" style={{ fontFamily: "Georgia, serif" }}>계산기</h1>
            <p className="text-[#87867f] text-sm">수익률과 세후 수익을 계산합니다</p>
          </div>
        </AnimateIn>

        {message && (
          <div className="mb-6 px-4 py-3 bg-[#c96442]/10 border border-[#c96442]/30 rounded-xl text-sm text-[#c96442]">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inputs */}
          <AnimateIn from="bottom" delay={60}>
            <div className="lg:col-span-1 space-y-4">
              <div className={cardCls}>
                <label className={labelCls}>원금</label>
                <input type="range" min="1000" max="1000000" step="1000" value={principal}
                  onChange={e => setPrincipal(Number(e.target.value))} className="w-full mb-3 accent-[#c96442]" />
                <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value))} className={inputCls} />
                <p className="text-xs text-[#87867f] mt-2">$1K — $1M</p>
              </div>

              <div className={cardCls}>
                <label className={labelCls}>투자 기간</label>
                <input type="range" min="1" max="120" value={periodMonths}
                  onChange={e => setPeriodMonths(Number(e.target.value))} className="w-full mb-3 accent-[#c96442]" />
                <div className="flex gap-2 items-center">
                  <input type="number" value={periodMonths} onChange={e => setPeriodMonths(Number(e.target.value))} className={inputCls} />
                  <span className="text-xs text-[#87867f] shrink-0">개월</span>
                </div>
                <p className="text-xs text-[#87867f] mt-2">{(periodMonths / 12).toFixed(1)}년</p>
              </div>

              <div className={cardCls}>
                <label className={labelCls}>목표 수익률</label>
                <input type="range" min="1" max="100" value={targetROI}
                  onChange={e => setTargetROI(Number(e.target.value))} className="w-full mb-3 accent-[#c96442]" />
                <div className="flex gap-2 items-center">
                  <input type="number" value={targetROI} onChange={e => setTargetROI(Number(e.target.value))} className={inputCls} />
                  <span className="text-xs text-[#87867f] shrink-0">%</span>
                </div>
              </div>

              <div className={cardCls}>
                <label className={labelCls}>이자 유형</label>
                <div className="space-y-2.5">
                  {[{ v: true, label: "복리" }, { v: false, label: "단리" }].map(opt => (
                    <label key={String(opt.v)} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="radio" checked={isCompound === opt.v} onChange={() => setIsCompound(opt.v)}
                        className="w-4 h-4 accent-[#c96442]" />
                      <span className="text-sm text-[#141413]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={cardCls}>
                <label className={labelCls}>세율 구간</label>
                <select value={taxBracket} onChange={e => setTaxBracket(e.target.value)} className={inputCls}>
                  {Object.entries(TAX_BRACKETS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
                <p className="text-xs text-[#87867f] mt-2">세율: {(selectedTaxRate * 100).toFixed(1)}%</p>
              </div>

              <div className="space-y-2">
                <button onClick={handleSave} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c96442] text-[#faf9f5] rounded-xl text-sm font-medium hover:bg-[#b8573b] transition-colors shadow-[0px_0px_0px_1px_#c96442]">
                  <Save size={15} />{saving ? "저장 중..." : "저장"}
                </button>
                <button onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#e8e6dc] text-[#4d4c48] rounded-xl text-sm font-medium hover:bg-[#d1cfc5] transition-colors shadow-[0px_0px_0px_1px_#d1cfc5]">
                  <Copy size={15} />결과 복사
                </button>
                <button onClick={() => setShareDialogOpen(true)} disabled={!result}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#e8e6dc] text-[#4d4c48] rounded-xl text-sm font-medium hover:bg-[#d1cfc5] transition-colors shadow-[0px_0px_0px_1px_#d1cfc5] disabled:opacity-40">
                  <Share2 size={15} />공유
                </button>
              </div>
            </div>
          </AnimateIn>

          {/* Results */}
          <AnimateIn from="bottom" delay={120}>
            <div className="lg:col-span-2 space-y-5">
              {result && (
                <>
                  {/* Summary */}
                  <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-6 shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
                    <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-4">결과 요약</p>
                    <div className="grid grid-cols-2 gap-5">
                      {[
                        { label: "최종 금액", value: formatCurrency(result.finalValue), color: "text-[#2d6a4f]" },
                        { label: "순 수익", value: formatCurrency(result.netProfit), color: "text-[#c96442]" },
                        { label: "세금", value: formatCurrency(result.taxAmount), color: "text-[#92600a]" },
                        { label: "세후 ROI", value: `${result.afterTaxROI.toFixed(2)}%`, color: "text-[#141413]" },
                      ].map(item => (
                        <div key={item.label}>
                          <p className="text-xs text-[#87867f] mb-1">{item.label}</p>
                          <p className={`text-2xl font-medium ${item.color}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Growth Chart */}
                  <div className={cardCls}>
                    <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-4">월별 성장</p>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.monthlyGrowth}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0eee6" />
                          <XAxis dataKey="month" stroke="#87867f" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#87867f" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={chartTooltipStyle} formatter={v => formatCurrency(Number(v))} />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="#2d6a4f" dot={false} name="세전" strokeWidth={2} />
                          <Line type="monotone" dataKey="afterTax" stroke="#c96442" dot={false} name="세후" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Scenarios Chart */}
                  <div className={cardCls}>
                    <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-4">ROI 시나리오</p>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scenarios}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0eee6" />
                          <XAxis dataKey="roi" stroke="#87867f" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#87867f" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={chartTooltipStyle} formatter={v => formatCurrency(Number(v))} />
                          <Legend />
                          <Bar dataKey="finalValue" fill="#c96442" name="최종금액" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="netProfit" fill="#e8e6dc" name="순수익" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Table */}
                  <div className={cardCls}>
                    <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-4">시나리오 비교</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#f0eee6]">
                            {["ROI", "최종금액", "총수익", "세금", "순수익", "세후ROI"].map(h => (
                              <th key={h} className="text-left py-2.5 px-3 text-xs font-medium text-[#87867f] uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {scenarios.map((s, i) => (
                            <tr key={i} className="border-b border-[#f0eee6]/50 hover:bg-[#f5f4ed] transition-colors">
                              <td className="py-2.5 px-3 font-mono text-[#141413] font-medium">{s.roi}%</td>
                              <td className="py-2.5 px-3 font-mono text-[#2d6a4f]">{formatCurrency(s.finalValue)}</td>
                              <td className="py-2.5 px-3 font-mono text-[#5e5d59]">{formatCurrency(s.finalValue - principal)}</td>
                              <td className="py-2.5 px-3 font-mono text-[#92600a]">{formatCurrency((s.finalValue - principal) * selectedTaxRate)}</td>
                              <td className="py-2.5 px-3 font-mono text-[#141413] font-medium">{formatCurrency(s.netProfit)}</td>
                              <td className="py-2.5 px-3 font-mono text-[#c96442] font-medium">{s.afterTaxROI.toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </AnimateIn>
        </div>

        {result && <ShareCalculationDialog calculation={result} isOpen={shareDialogOpen} onClose={() => setShareDialogOpen(false)} />}
      </div>
    </div>
  )
}
