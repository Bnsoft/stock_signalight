const DRAWDOWN_LEVELS = [
  { pct: -10, action: "Start buying QLD",       width: "20%"  },
  { pct: -15, action: "Add TQQQ small position", width: "36%"  },
  { pct: -20, action: "Increase TQQQ allocation",width: "52%"  },
  { pct: -25, action: "Aggressive TQQQ entry",   width: "68%"  },
  { pct: -30, action: "Max TQQQ allocation",     width: "84%"  },
]

const CURRENT_DD = -7.9
const ETFS = [
  { symbol: "QQQ",  name: "Invesco QQQ",          price: "$584", dd: "-7.9%" },
  { symbol: "QLD",  name: "ProShares Ultra QQQ",   price: "$78",  dd: "-15.1%" },
  { symbol: "TQQQ", name: "ProShares UltraPro QQQ",price: "$43",  dd: "-28.1%" },
]

export function Strategy() {
  return (
    <section id="strategy" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left */}
          <div>
            <span className="text-xs font-mono text-signal-green uppercase tracking-widest mb-3 block">
              Built-in Strategy
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              QQQ Drawdown Entry System
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Signalight includes a staged entry strategy based on QQQ&apos;s drawdown from
              all-time high. As the market drops further, you scale into leveraged ETFs
              systematically — not emotionally.
            </p>

            {/* Drawdown bar chart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>QQQ Drawdown from ATH</span>
                <span className="font-mono text-signal-amber">Current: {CURRENT_DD}%</span>
              </div>
              {DRAWDOWN_LEVELS.map((lvl) => {
                const isTriggered = CURRENT_DD <= lvl.pct
                return (
                  <div key={lvl.pct} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={isTriggered ? "text-signal-green font-medium" : "text-muted-foreground"}>
                        {lvl.action}
                      </span>
                      <span className={`font-mono ${isTriggered ? "text-signal-green" : "text-muted-foreground"}`}>
                        {lvl.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isTriggered ? "bg-signal-green" : "bg-border"
                        }`}
                        style={{ width: lvl.width }}
                      />
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-muted-foreground pt-1">
                ● Current QQQ position: <span className="text-signal-amber">−7.9% from ATH</span> · No entry levels triggered yet
              </p>
            </div>
          </div>

          {/* Right — ETF cards */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">Related ETFs in your watchlist</p>
            {ETFS.map((etf) => (
              <div
                key={etf.symbol}
                className="rounded-xl border border-border bg-card px-5 py-4 flex items-center justify-between hover:border-signal-green/30 transition-colors"
              >
                <div>
                  <p className="font-semibold">{etf.symbol}</p>
                  <p className="text-xs text-muted-foreground">{etf.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold">{etf.price}</p>
                  <p className="text-xs font-mono text-signal-red">{etf.dd} from ATH</p>
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-signal-green/20 bg-signal-green/5 px-5 py-4 text-sm text-muted-foreground">
              💡 When QQQ drops −10%, Signalight fires an{" "}
              <span className="text-signal-green font-medium">ACTION signal</span>{" "}
              to your Telegram with the suggested allocation.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
