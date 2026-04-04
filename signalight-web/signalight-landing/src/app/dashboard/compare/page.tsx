"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const SYMBOLS = ["QQQ", "TQQQ", "QLD", "SPY", "SPYI", "QQQI"]
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

interface ChartDataPoint {
  date: string
  [key: string]: number | string
}

export default function ComparePage() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["QQQ", "SPY"])
  const [logScale, setLogScale] = useState(false)
  const [data, setData] = useState<ChartDataPoint[]>([])

  const handleAddSymbol = (symbol: string) => {
    if (!selectedSymbols.includes(symbol) && selectedSymbols.length < 6) {
      setSelectedSymbols([...selectedSymbols, symbol])
    }
  }

  const handleRemoveSymbol = (symbol: string) => {
    setSelectedSymbols(selectedSymbols.filter((s) => s !== symbol))
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Multi-Symbol Comparison</h1>
            <p className="text-muted-foreground">Compare performance across symbols</p>
          </div>
        </AnimateIn>

        {/* Controls */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-3">Selected Symbols</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedSymbols.map((sym, idx) => (
                    <div
                      key={sym}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border"
                      style={{ borderColor: COLORS[idx % COLORS.length] }}
                    >
                      <span className="font-mono">{sym}</span>
                      <button
                        onClick={() => handleRemoveSymbol(sym)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Add Symbols</label>
                <div className="flex flex-wrap gap-2">
                  {SYMBOLS.filter((s) => !selectedSymbols.includes(s)).map((sym) => (
                    <Button
                      key={sym}
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddSymbol(sym)}
                    >
                      + {sym}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logScale}
                    onChange={(e) => setLogScale(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Log Scale</span>
                </label>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Chart */}
        <AnimateIn from="bottom" delay={160}>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>
            <div className="w-full h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.length > 0 ? data : generateDummyData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#999" />
                  <YAxis scale={logScale ? "log" : "linear"} stroke="#999" />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} />
                  <Legend />
                  {selectedSymbols.map((sym, idx) => (
                    <Line
                      key={sym}
                      type="monotone"
                      dataKey={sym}
                      stroke={COLORS[idx % COLORS.length]}
                      dot={false}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}

function generateDummyData() {
  const data = []
  let prices: Record<string, number> = {
    QQQ: 590,
    SPY: 445,
    TQQQ: 120,
    QLD: 78,
  }

  for (let i = 0; i < 30; i++) {
    const point: ChartDataPoint = { date: `Day ${i + 1}` }
    Object.keys(prices).forEach((sym) => {
      prices[sym] *= 1 + (Math.random() - 0.5) * 0.02
      point[sym] = Math.round(prices[sym] * 100) / 100
    })
    data.push(point)
  }

  return data
}
