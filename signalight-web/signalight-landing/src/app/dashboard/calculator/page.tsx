"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  calculateProfit,
  generateScenarios,
  TAX_BRACKETS,
  formatCurrency,
  type CalculationInput,
  type CalculationResult,
} from "@/lib/calculator"
import { Save, Copy } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function CalculatorPage() {
  const { user, token } = useAuth()

  // Input states
  const [principal, setPrincipal] = useState(10000)
  const [periodMonths, setPeriodMonths] = useState(12)
  const [targetROI, setTargetROI] = useState(15)
  const [isCompound, setIsCompound] = useState(true)
  const [taxBracket, setTaxBracket] = useState("us_capital_gains_long")

  // Calculation states
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [scenarios, setScenarios] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  // Tax bracket selection
  const selectedTaxRate = TAX_BRACKETS[taxBracket]?.longTerm || 0

  // Recalculate when inputs change
  useEffect(() => {
    const input: CalculationInput = {
      principal,
      periodMonths,
      targetROI,
      isCompound,
      taxRate: selectedTaxRate * 100, // Convert to percentage
    }

    const newResult = calculateProfit(input)
    setResult(newResult)

    const newScenarios = generateScenarios(principal, periodMonths, selectedTaxRate * 100, isCompound)
    setScenarios(newScenarios)
  }, [principal, periodMonths, targetROI, isCompound, taxBracket, selectedTaxRate])

  const handleSaveCalculation = async () => {
    if (!user?.user_id || !token || !result) return

    setSaving(true)
    setMessage("")

    try {
      const res = await fetch(`${API_BASE}/api/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.user_id,
          principal,
          period_months: periodMonths,
          target_roi: targetROI,
          is_compound: isCompound,
          tax_rate: selectedTaxRate * 100,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to save calculation")
      }

      setMessage("✓ Calculation saved successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (err: any) {
      setMessage("✗ " + (err.message || "Error saving calculation"))
    } finally {
      setSaving(false)
    }
  }

  const handleCopyResults = () => {
    const text = `Profit Calculator Results
Principal: ${formatCurrency(result?.principal || 0)}
Period: ${periodMonths} months
Target ROI: ${targetROI}%
Final Value: ${formatCurrency(result?.finalValue || 0)}
Net Profit: ${formatCurrency(result?.netProfit || 0)}
After-Tax ROI: ${result?.afterTaxROI.toFixed(2)}%`

    navigator.clipboard.writeText(text)
    setMessage("✓ Results copied to clipboard!")
    setTimeout(() => setMessage(""), 3000)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Profit Calculator</h1>
            <p className="text-muted-foreground">
              Calculate your expected returns with tax considerations
            </p>
          </div>
        </AnimateIn>

        {message && (
          <AnimateIn from="bottom">
            <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg text-sm">
              {message}
            </div>
          </AnimateIn>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <AnimateIn from="bottom" delay={80}>
            <div className="lg:col-span-1 space-y-6">
              {/* Principal Input */}
              <div className="bg-card border border-border rounded-lg p-6">
                <label className="block text-sm font-semibold mb-3">Principal Amount</label>
                <input
                  type="range"
                  min="1000"
                  max="1000000"
                  step="1000"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full mb-2"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={principal}
                    onChange={(e) => setPrincipal(Number(e.target.value))}
                    className="flex-1 px-2 py-1 bg-muted border border-border rounded text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">$1K - $1M</p>
              </div>

              {/* Period Input */}
              <div className="bg-card border border-border rounded-lg p-6">
                <label className="block text-sm font-semibold mb-3">Investment Period</label>
                <input
                  type="range"
                  min="1"
                  max="120"
                  step="1"
                  value={periodMonths}
                  onChange={(e) => setPeriodMonths(Number(e.target.value))}
                  className="w-full mb-2"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={periodMonths}
                    onChange={(e) => setPeriodMonths(Number(e.target.value))}
                    className="flex-1 px-2 py-1 bg-muted border border-border rounded text-sm"
                  />
                  <span className="text-xs text-muted-foreground">months</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {(periodMonths / 12).toFixed(1)} years
                </p>
              </div>

              {/* ROI Input */}
              <div className="bg-card border border-border rounded-lg p-6">
                <label className="block text-sm font-semibold mb-3">Target ROI</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={targetROI}
                  onChange={(e) => setTargetROI(Number(e.target.value))}
                  className="w-full mb-2"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={targetROI}
                    onChange={(e) => setTargetROI(Number(e.target.value))}
                    className="flex-1 px-2 py-1 bg-muted border border-border rounded text-sm"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              {/* Interest Type */}
              <div className="bg-card border border-border rounded-lg p-6">
                <label className="block text-sm font-semibold mb-3">Interest Type</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={isCompound}
                      onChange={() => setIsCompound(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Compound Interest</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isCompound}
                      onChange={() => setIsCompound(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Simple Interest</span>
                  </label>
                </div>
              </div>

              {/* Tax Bracket */}
              <div className="bg-card border border-border rounded-lg p-6">
                <label className="block text-sm font-semibold mb-3">Tax Bracket</label>
                <select
                  value={taxBracket}
                  onChange={(e) => setTaxBracket(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded text-sm"
                >
                  {Object.entries(TAX_BRACKETS).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Tax Rate: {(selectedTaxRate * 100).toFixed(1)}%
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={handleSaveCalculation}
                  disabled={saving}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Calculation"}
                </Button>
                <Button
                  onClick={handleCopyResults}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Results
                </Button>
              </div>
            </div>
          </AnimateIn>

          {/* Results Panel */}
          <AnimateIn from="bottom" delay={160}>
            <div className="lg:col-span-2 space-y-6">
              {/* Results Summary */}
              {result && (
                <>
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                      Results Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Final Value</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(result.finalValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(result.netProfit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Tax Amount</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(result.taxAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">After-Tax ROI</p>
                        <p className="text-2xl font-bold text-primary">
                          {result.afterTaxROI.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Growth Chart */}
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-sm font-semibold mb-4">Monthly Growth</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.monthlyGrowth}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis
                            dataKey="month"
                            stroke="#999"
                            label={{ value: "Months", position: "insideRight", offset: -5 }}
                          />
                          <YAxis stroke="#999" />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
                            dot={false}
                            name="Before Tax"
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="afterTax"
                            stroke="#3b82f6"
                            dot={false}
                            name="After Tax"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Scenario Comparison */}
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-sm font-semibold mb-4">ROI Scenarios</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scenarios}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis
                            dataKey="roi"
                            stroke="#999"
                            label={{ value: "ROI %", position: "insideRight", offset: -5 }}
                          />
                          <YAxis stroke="#999" />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                          <Legend />
                          <Bar dataKey="finalValue" fill="#10b981" name="Final Value" />
                          <Bar dataKey="netProfit" fill="#3b82f6" name="Net Profit" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Scenario Comparison Table */}
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-sm font-semibold mb-4">Detailed Scenario Comparison</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-semibold">ROI</th>
                            <th className="text-right py-3 px-4">Final Value</th>
                            <th className="text-right py-3 px-4">Gross Profit</th>
                            <th className="text-right py-3 px-4">Tax</th>
                            <th className="text-right py-3 px-4">Net Profit</th>
                            <th className="text-right py-3 px-4">After-Tax ROI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scenarios.map((scenario, idx) => (
                            <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition">
                              <td className="py-3 px-4 font-mono font-semibold">{scenario.roi}%</td>
                              <td className="text-right py-3 px-4 font-mono text-green-600">
                                {formatCurrency(scenario.finalValue)}
                              </td>
                              <td className="text-right py-3 px-4 font-mono text-blue-600">
                                {formatCurrency(
                                  scenario.finalValue - principal
                                )}
                              </td>
                              <td className="text-right py-3 px-4 font-mono text-orange-600">
                                {formatCurrency(
                                  (scenario.finalValue - principal) *
                                    (selectedTaxRate)
                                )}
                              </td>
                              <td className="text-right py-3 px-4 font-mono font-semibold">
                                {formatCurrency(scenario.netProfit)}
                              </td>
                              <td className="text-right py-3 px-4 font-mono text-primary font-semibold">
                                {scenario.afterTaxROI.toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Key Takeaways */}
                  <div className="bg-muted/50 border border-border/50 rounded-lg p-6">
                    <h3 className="text-sm font-semibold mb-3">Key Takeaways</h3>
                    <ul className="text-xs text-muted-foreground space-y-2">
                      <li>
                        • <strong>Final Value:</strong> Total amount after investing for {periodMonths}{" "}
                        month{periodMonths !== 1 ? "s" : ""}
                      </li>
                      <li>
                        • <strong>After-Tax ROI:</strong> Actual return after accounting for {(selectedTaxRate * 100).toFixed(1)}% tax
                      </li>
                      <li>
                        • <strong>Compound Interest:</strong>{" "}
                        {isCompound
                          ? "Earning returns on your returns — accelerates growth"
                          : "Linear growth — returns calculated on original principal"}
                      </li>
                      <li>
                        • <strong>Tax Planning:</strong> Consider timing and jurisdiction to optimize
                        after-tax returns
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </AnimateIn>
        </div>
      </div>
    </div>
  )
}
