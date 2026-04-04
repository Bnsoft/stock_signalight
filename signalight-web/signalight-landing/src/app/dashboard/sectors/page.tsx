"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { AnimateIn } from "@/components/layout/AnimateIn"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface SectorData {
  sector: string
  performance: number
  symbols: Record<string, number>
}

export default function SectorsPage() {
  const [sectors, setSectors] = useState<SectorData[]>([])
  const [correlation, setCorrelation] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [heatmapRes, corrRes] = await Promise.all([
          fetch(`${API_BASE}/api/sector-heatmap`),
          fetch(`${API_BASE}/api/correlation-matrix`),
        ])

        if (heatmapRes.ok) {
          const data = await heatmapRes.json()
          const sectorList = Object.entries(data.sectors).map(([sector, symbols]: any) => ({
            sector,
            performance: Math.max(...Object.values(symbols as Record<string, number>)),
            symbols,
          }))
          setSectors(sectorList)
        }

        if (corrRes.ok) {
          const data = await corrRes.json()
          setCorrelation(data.correlation)
        }
      } catch (err) {
        console.log("Sector data unavailable")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const chartData = sectors.map((s) => ({
    name: s.sector,
    performance: s.performance,
  }))

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Sector Analysis</h1>
            <p className="text-muted-foreground">Sector performance and correlation matrix</p>
          </div>
        </AnimateIn>

        {/* Sector Heatmap */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Sector Performance</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} />
                  <Bar dataKey="performance" fill="#10b981">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AnimateIn>

        {/* Correlation Matrix */}
        <AnimateIn from="bottom" delay={160}>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Symbol Correlation Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">Symbol</th>
                    {Object.keys(correlation).map((symbol) => (
                      <th key={symbol} className="text-center py-3 px-4">
                        {symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(correlation).map(([symbol, correlations]) => (
                    <tr key={symbol} className="border-b border-border/50">
                      <td className="py-3 px-4 font-mono font-semibold">{symbol}</td>
                      {Object.entries(correlations).map(([otherSymbol, value]) => (
                        <td
                          key={`${symbol}-${otherSymbol}`}
                          className="text-center py-3 px-4 font-mono"
                          style={{
                            backgroundColor: `rgba(16, 185, 129, ${(value as number) * 0.2})`,
                          }}
                        >
                          {(value as number).toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}
