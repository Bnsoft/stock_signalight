"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AnimateIn } from "@/components/layout/AnimateIn"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface SignalStat {
  signal_type: string
  total: number
  wins: number
  losses: number
  win_rate: number
}

const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6"]

export default function AnalyticsPage() {
  const [stats, setStats] = useState<SignalStat[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/signal-stats`)
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats || [])
        }
      } catch (err) {
        console.log("Analytics unavailable")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const totalSignals = stats.reduce((sum, s) => sum + s.total, 0)
  const totalWins = stats.reduce((sum, s) => sum + s.wins, 0)
  const overallWinRate = totalSignals > 0 ? ((totalWins / totalSignals) * 100).toFixed(1) : "0"

  const pieData = [
    { name: "Winning", value: totalWins },
    { name: "Losing", value: totalSignals - totalWins },
  ]

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Signal Analytics</h1>
            <p className="text-muted-foreground">Performance analysis by signal type</p>
          </div>
        </AnimateIn>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <AnimateIn from="bottom" delay={80}>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground">Total Signals</p>
              <p className="text-3xl font-bold text-signal-green">{totalSignals}</p>
            </div>
          </AnimateIn>

          <AnimateIn from="bottom" delay={160}>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground">Winning</p>
              <p className="text-3xl font-bold text-signal-green">{totalWins}</p>
            </div>
          </AnimateIn>

          <AnimateIn from="bottom" delay={240}>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground">Losing</p>
              <p className="text-3xl font-bold text-signal-red">{totalSignals - totalWins}</p>
            </div>
          </AnimateIn>

          <AnimateIn from="bottom" delay={320}>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-3xl font-bold text-signal-amber">{overallWinRate}%</p>
            </div>
          </AnimateIn>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Win Rate by Signal Type */}
          <AnimateIn from="left" delay={80}>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Win Rate by Signal Type</h3>
              {stats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="signal_type" stroke="#999" />
                    <YAxis stroke="#999" />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} />
                    <Bar dataKey="win_rate" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              )}
            </div>
          </AnimateIn>

          {/* Overall Win/Loss */}
          <AnimateIn from="right" delay={80}>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Overall Win/Loss Distribution</h3>
              {totalSignals > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }: any) => `${name}: ${value} (${percent ? (percent * 100).toFixed(1) : 0}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              )}
            </div>
          </AnimateIn>
        </div>

        {/* Signal Details Table */}
        <AnimateIn from="bottom" delay={160}>
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Signal Performance Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">Signal Type</th>
                    <th className="text-center py-3 px-4">Total</th>
                    <th className="text-center py-3 px-4">Wins</th>
                    <th className="text-center py-3 px-4">Losses</th>
                    <th className="text-center py-3 px-4">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.length > 0 ? (
                    stats.map((stat, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition">
                        <td className="py-3 px-4 font-mono">{stat.signal_type}</td>
                        <td className="text-center py-3 px-4">{stat.total}</td>
                        <td className="text-center py-3 px-4 text-signal-green">{stat.wins}</td>
                        <td className="text-center py-3 px-4 text-signal-red">{stat.losses}</td>
                        <td className="text-center py-3 px-4 font-semibold">{stat.win_rate.toFixed(1)}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No signals yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}
