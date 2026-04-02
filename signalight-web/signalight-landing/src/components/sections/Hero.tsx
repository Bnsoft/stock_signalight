import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

const MOCK_SIGNALS = [
  { type: "ACTION", emoji: "🚨", symbol: "TQQQ", signal: "RSI Oversold (28.3)", detail: "Price: $42.15  ·  Drawdown: -18.2%" },
  { type: "WARNING", emoji: "⚠️", symbol: "QQQ",  signal: "MA Death Cross",      detail: "MA20: $443.20  <  MA60: $447.80" },
  { type: "INFO",    emoji: "ℹ️", symbol: "SPY",  signal: "Volume Spike 2.4×",   detail: "Vol: 84.2M  ·  Avg: 35.1M" },
]

const SEVERITY_COLORS: Record<string, string> = {
  ACTION:  "text-signal-red border-signal-red/30 bg-signal-red/5",
  WARNING: "text-signal-amber border-signal-amber/30 bg-signal-amber/5",
  INFO:    "text-muted-foreground border-border bg-muted/30",
}

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Green glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[600px] h-[300px] rounded-full bg-signal-green/5 blur-3xl" />

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left — copy */}
          <div className="flex-1 text-center lg:text-left">
            <Badge variant="outline" className="mb-6 text-signal-green border-signal-green/30 bg-signal-green/5">
              🚀 Now in Beta · Free to use
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
              Signal + Light.{" "}
              <span className="text-signal-green">
                When the signal fires,
              </span>{" "}
              you see the light.
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Personal stock signal scanner for ETF traders.
              RSI, MA crossover, Bollinger Bands, QQQ drawdown alerts —
              calculated automatically and sent straight to your Telegram.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Button size="lg" className="bg-signal-green hover:bg-signal-green/90 text-black font-semibold px-8">
                Start Free
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View on GitHub
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card. No account needed. Just Python + Telegram.
            </p>
          </div>

          {/* Right — signal feed mockup */}
          <div className="flex-1 w-full max-w-md lg:max-w-none">
            <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden glow-green">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-signal-red/70" />
                  <div className="w-3 h-3 rounded-full bg-signal-amber/70" />
                  <div className="w-3 h-3 rounded-full bg-signal-green/70" />
                </div>
                <span className="text-xs text-muted-foreground ml-2 font-mono">signalight · live feed</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse" />
                  <span className="text-xs text-signal-green font-mono">scanning</span>
                </div>
              </div>

              {/* Signal cards */}
              <div className="p-4 space-y-3 font-mono text-sm">
                {MOCK_SIGNALS.map((s, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border px-4 py-3 ${SEVERITY_COLORS[s.type]}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">
                        {s.emoji} {s.type} · {s.symbol}
                      </span>
                      <span className="text-xs opacity-60">just now</span>
                    </div>
                    <p className="text-xs opacity-80">{s.signal}</p>
                    <p className="text-xs opacity-50 mt-0.5">{s.detail}</p>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-signal-green" />
                  Scan complete · 7 symbols · next in 5 min
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
