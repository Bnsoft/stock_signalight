"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Download, Trash2 } from "lucide-react"

interface Calculation {
  id: number
  principal: number
  period_months: number
  target_roi: number
  final_value: number
  net_profit: number
  tax_amount: number
  after_tax_roi: number
  tax_rate: number
  created_at: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function CalculationsPage() {
  const { user, token } = useAuth()
  const [calculations, setCalculations] = useState<Calculation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchCalculations = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/user/${user.user_id}/calculations`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (!res.ok) {
          throw new Error("Failed to load calculations")
        }

        const data = await res.json()
        setCalculations(data.calculations)
      } catch (err: any) {
        setError(err.message || "Error loading calculations")
      } finally {
        setLoading(false)
      }
    }

    fetchCalculations()
  }, [user, token])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const exportAsCSV = () => {
    if (calculations.length === 0) return

    const headers = [
      "Principal",
      "Period (Months)",
      "Target ROI (%)",
      "Final Value",
      "Tax Amount",
      "Net Profit",
      "After-Tax ROI (%)",
      "Date",
    ]

    const rows = calculations.map((calc) => [
      calc.principal,
      calc.period_months,
      calc.target_roi,
      calc.final_value,
      calc.tax_amount,
      calc.net_profit,
      calc.after_tax_roi,
      new Date(calc.created_at).toLocaleString(),
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `signalight-calculations-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Calculations</h1>
              <p className="text-muted-foreground">
                Your calculation history and results
              </p>
            </div>
            {calculations.length > 0 && (
              <button
                onClick={exportAsCSV}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </AnimateIn>

        {error && (
          <AnimateIn from="bottom">
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          </AnimateIn>
        )}

        {calculations.length === 0 ? (
          <AnimateIn from="bottom">
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground mb-4">
                No calculations yet. Start by creating a profit calculation!
              </p>
              <a
                href="/dashboard/calculator"
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
              >
                Go to Calculator
              </a>
            </div>
          </AnimateIn>
        ) : (
          <AnimateIn from="bottom" delay={80}>
            <div className="space-y-4">
              {calculations.map((calc, index) => (
                <div
                  key={calc.id}
                  className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Principal</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(calc.principal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Final Value</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(calc.final_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">After-Tax Profit</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatCurrency(calc.net_profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">After-Tax ROI</p>
                      <p className="text-lg font-semibold text-primary">
                        {calc.after_tax_roi.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                    <div>
                      Period: {calc.period_months} month
                      {calc.period_months !== 1 ? "s" : ""}
                    </div>
                    <div>Target ROI: {calc.target_roi.toFixed(2)}%</div>
                    <div>
                      {new Date(calc.created_at).toLocaleDateString()} at{" "}
                      {new Date(calc.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimateIn>
        )}
      </div>
    </div>
  )
}
