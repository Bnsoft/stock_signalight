"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { ArrowRight, TrendingUp } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { formatCurrency } from "@/lib/calculator"

interface BacktestResult {
  id: number
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
  max_drawdown_percent: number
  created_at: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function BacktestCalculatorPage() {
  const { user, token } = useAuth()
  const [backtest, setBacktest] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedSymbol, setSelectedSymbol] = useState("QQQ")

  useEffect(() => {
    if (!token) return

    const fetchBacktests = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/backtest-results?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          throw new Error("Failed to load backtest results")
        }

        const data = await res.json()
        if (data.results && data.results.length > 0) {
          setBacktest(data.results[0])
        }
      } catch (err: any) {
        setError(err.message || "Error loading backtest data")
      } finally {
        setLoading(false)
      }
    }

    fetchBacktests()
  }, [token])

  // Generate mock equity curve for visualization
  const generateEquityCurve = (initialCapital: number, finalCapital: number) => {
    const days = 90
    const data = []
    const dailyGrowth = (finalCapital / initialCapital) ** (1 / days) - 1

    for (let i = 0; i <= days; i++) {
      data.push({
        day: i,
        equity: initialCapital * Math.pow(1 + dailyGrowth, i),
      })
    }
    return data
  }

  const handleUseForCalculator = () => {
    if (!backtest) return
    // Navigate to calculator with backtest data pre-populated
    const roiPercent = backtest.total_roi_percent
    window.location.href =
      `/dashboard/calculator?roi=${roiPercent}&period=90&principal=10000`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Backtest-Based Calculator</h1>
            <p className="text-muted-foreground">
              Use historical performance to project future returns
            </p>
          </div>
        </AnimateIn>

        {error && (
          <AnimateIn from="bottom">
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          </AnimateIn>
        )}

        {!backtest ? (
          <AnimateIn from="bottom" delay={80}>
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Backtest Results Yet</h3>
              <p className="text-muted-foreground mb-6">
                Run a backtest first to see historical performance and projections
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/dashboard/backtest">
                  <Button>
                    Run Backtest
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/dashboard/calculator">
                  <Button variant="outline">Go to Calculator</Button>
                </Link>
              </div>
            </div>
          </AnimateIn>
        ) : (
          <>
            {/* Backtest Summary */}
            <AnimateIn from="bottom" delay={80}>
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Symbol</p>
                    <p className="text-2xl font-bold">{backtest.symbol}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total ROI</p>
                    <p className="text-2xl font-bold text-green-600">
                      {backtest.total_roi_percent.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {backtest.win_rate_percent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-primary/30">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Initial Capital</p>
                    <p className="font-semibold">
                      {formatCurrency(backtest.initial_capital)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Final Capital</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(backtest.final_capital)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
                    <p className="font-semibold">{backtest.total_trades}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Max Drawdown</p>
                    <p className="font-semibold text-orange-600">
                      {backtest.max_drawdown_percent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </AnimateIn>

            {/* Equity Curve */}
            <AnimateIn from="bottom" delay={160}>
              <div className="bg-card border border-border rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Equity Curve (90 Days)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={generateEquityCurve(
                        backtest.initial_capital,
                        backtest.final_capital
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="day"
                        stroke="#999"
                        label={{ value: "Days", position: "insideRight", offset: -5 }}
                      />
                      <YAxis stroke="#999" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="equity"
                        stroke="#10b981"
                        dot={false}
                        name="Account Value"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </AnimateIn>

            {/* Details & Actions */}
            <AnimateIn from="bottom" delay={240}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trade Stats */}
                <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Trade Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <span className="text-sm">Winning Trades</span>
                      <span className="font-semibold text-green-600">
                        {backtest.winning_trades}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <span className="text-sm">Losing Trades</span>
                      <span className="font-semibold text-red-600">
                        {backtest.losing_trades}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <span className="text-sm">Win Rate</span>
                      <span className="font-semibold">
                        {backtest.win_rate_percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <span className="text-sm">Period</span>
                      <span className="font-semibold">
                        ~90 days (
                        {new Date(backtest.start_date).toLocaleDateString()} to{" "}
                        {new Date(backtest.end_date).toLocaleDateString()})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Use For Calculator */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Use for Projection</h3>
                    <p className="text-sm text-muted-foreground">
                      Project future returns based on this backtest's {backtest.total_roi_percent.toFixed(2)}% ROI
                    </p>
                  </div>
                  <Button
                    onClick={handleUseForCalculator}
                    className="w-full mt-4"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Open Calculator
                  </Button>
                </div>
              </div>
            </AnimateIn>

            {/* Info */}
            <AnimateIn from="bottom" delay={320}>
              <div className="mt-8 p-4 bg-muted/50 border border-border/50 rounded-lg text-sm text-muted-foreground">
                <p>
                  <strong>Note:</strong> Past performance does not guarantee future results.
                  Use this calculator to understand the potential impact of different market
                  conditions and tax strategies on your returns.
                </p>
              </div>
            </AnimateIn>
          </>
        )}
      </div>
    </div>
  )
}
