"use client"

import { useState } from "react"
import { ChartContainer } from "@/components/dashboard/ChartContainer"
import { SignalFeed } from "@/components/dashboard/SignalFeed"
import { IndicatorPanel } from "@/components/dashboard/IndicatorPanel"
import { SymbolSelector } from "@/components/dashboard/SymbolSelector"

export default function DashboardPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("QQQ")
  const [selectedPeriod, setSelectedPeriod] = useState("1D")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-xs text-muted-foreground">Real-time signals & indicators</p>
          </div>
          <div className="flex items-center gap-4">
            <SymbolSelector value={selectedSymbol} onChange={setSelectedSymbol} />
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
        {/* Left: Signal Feed */}
        <div className="lg:col-span-1 overflow-hidden flex flex-col">
          <SignalFeed />
        </div>

        {/* Right: Chart + Indicators */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          {/* Chart */}
          <div className="flex-1 bg-card rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
              <span className="text-sm font-mono">{selectedSymbol}</span>
              <div className="flex gap-2 ml-auto">
                {["1D", "1W", "1M"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 text-xs rounded font-mono transition ${
                      selectedPeriod === period
                        ? "bg-signal-green text-black"
                        : "bg-muted text-muted-foreground hover:bg-border"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <ChartContainer symbol={selectedSymbol} period={selectedPeriod} />
          </div>

          {/* Indicators Panel */}
          <div className="bg-card rounded-lg border border-border p-4 overflow-y-auto max-h-32">
            <IndicatorPanel symbol={selectedSymbol} />
          </div>
        </div>
      </div>
    </div>
  )
}
