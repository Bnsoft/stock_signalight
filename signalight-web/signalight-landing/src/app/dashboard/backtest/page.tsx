"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const SYMBOLS = ["QQQ", "TQQQ", "QLD", "SPY", "SPYI", "QQQI", "JEPQ"]

interface BacktestResult {
  symbol: string
  start_date: string
  end_date: string
  initial_capital: number
  final_capital: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  win_rate_percent: number
  total_roi_percent: number
  max_drawdown: number
  trades: any[]
}

export default function BacktestPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("QQQ")
  const [days, setDays] = useState(90)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRunBacktest = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/backtest-run?symbol=${selectedSymbol}&days=${days}`)
      if (res.ok) {
        const data = await res.json()
        setResult(data)
      } else {
        alert("Backtest failed")
      }
    } catch (err) {
      alert("Backtest unavailable")
    } finally {
      setLoading(false)
    }
  }

  // Equity curve data (cumulative PnL)
  const equityCurve =
    result?.trades.map((trade, idx) => ({
      trade: idx + 1,
      equity:
        result.initial_capital +
        result.trades.slice(0, idx + 1).reduce((sum, t) => sum + t.pnl, 0),
    })) || []

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Backtest Engine</h1>
            <p className="text-muted-foreground">Simulate trading based on historical signals</p>
          </div>
        </AnimateIn>

        {/* Controls */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">Symbol</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border bg-card"
                >
                  {SYMBOLS.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Period (days)</label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  min="30"
                  max="365"
                  className="px-3 py-2 rounded-lg border border-border bg-card w-24"
                />
              </div>

              <Button
                onClick={handleRunBacktest}
                disabled={loading}
                className="bg-signal-green text-black hover:bg-signal-green/90"
              >
                {loading ? "Running..." : "Run Backtest"}
              </Button>
            </div>
          </div>
        </AnimateIn>

        {result && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <AnimateIn from="bottom" delay={80}>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold">{result.total_trades}</p>
                </div>
              </AnimateIn>

              <AnimateIn from="bottom" delay={160}>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold text-signal-green">{result.win_rate_percent.toFixed(1)}%</p>
                </div>
              </AnimateIn>

              <AnimateIn from="bottom" delay={240}>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Total ROI</p>
                  <p
                    className={`text-2xl font-bold ${
                      result.total_roi_percent > 0 ? "text-signal-green" : "text-signal-red"
                    }`}
                  >
                    {result.total_roi_percent > 0 ? "+" : ""}
                    {result.total_roi_percent.toFixed(2)}%
                  </p>
                </div>
              </AnimateIn>

              <AnimateIn from="bottom" delay={320}>
                <div className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Max Drawdown</p>
                  <p className="text-2xl font-bold text-signal-red">
                    -${result.max_drawdown.toFixed(2)}
                  </p>
                </div>
              </AnimateIn>
            </div>

            {/* Equity Curve */}
            {equityCurve.length > 0 && (
              <AnimateIn from="bottom" delay={80}>
                <div className="bg-card border border-border rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-semibold mb-4">Equity Curve</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="trade" stroke="#999" />
                      <YAxis stroke="#999" />
                      <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} />
                      <Line
                        type="monotone"
                        dataKey="equity"
                        stroke="#10b981"
                        dot={false}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </AnimateIn>
            )}

            {/* Trade Details */}
            <AnimateIn from="bottom" delay={160}>
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4">Entry</th>
                        <th className="text-left py-3 px-4">Exit</th>
                        <th className="text-right py-3 px-4">Entry Price</th>
                        <th className="text-right py-3 px-4">Exit Price</th>
                        <th className="text-right py-3 px-4">P&L</th>
                        <th className="text-right py-3 px-4">ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.map((trade, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-4 font-mono text-xs">{trade.entry_date.split("T")[0]}</td>
                          <td className="py-3 px-4 font-mono text-xs">{trade.exit_date.split("T")[0]}</td>
                          <td className="text-right py-3 px-4">${trade.entry_price.toFixed(2)}</td>
                          <td className="text-right py-3 px-4">${trade.exit_price.toFixed(2)}</td>
                          <td
                            className={`text-right py-3 px-4 font-semibold ${
                              trade.pnl > 0 ? "text-signal-green" : "text-signal-red"
                            }`}
                          >
                            {trade.pnl > 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                          </td>
                          <td
                            className={`text-right py-3 px-4 font-semibold ${
                              trade.roi_percent > 0 ? "text-signal-green" : "text-signal-red"
                            }`}
                          >
                            {trade.roi_percent > 0 ? "+" : ""}
                            {trade.roi_percent.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </AnimateIn>
          </>
        )}
      </div>
    </div>
  )
}
