import { BotMessageSquare, ListPlus, Zap } from "lucide-react"

const STEPS = [
  {
    step: "01",
    icon: BotMessageSquare,
    title: "Connect Telegram",
    desc: "Create a bot via @BotFather in 2 minutes. Paste the token into .env. That's your private alert channel.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    step: "02",
    icon: ListPlus,
    title: "Set Your Watchlist",
    desc: "Default includes QQQ, SPY, TQQQ, QLD, SPYI, QQQI, JEPQ. Add or remove symbols any time with /add or /remove.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    step: "03",
    icon: Zap,
    title: "Receive Signals",
    desc: "Scanner runs every 5 minutes during market hours. RSI oversold, MA crossover, drawdown entries — straight to your phone.",
    color: "text-signal-green",
    bg: "bg-signal-green/10",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Up and running in 3 steps
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            No cloud accounts, no API keys to buy. Just Python, Telegram, and a terminal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[calc(33.33%+24px)] right-[calc(33.33%+24px)] h-px bg-border" />

          {STEPS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.step} className="flex flex-col items-center text-center relative">
                <div className={`w-14 h-14 rounded-full ${s.bg} flex items-center justify-center mb-5 border border-border relative z-10`}>
                  <Icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <div className="text-xs font-mono text-muted-foreground mb-2">{s.step}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{s.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Code snippet */}
        <div className="mt-12 max-w-xl mx-auto">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-signal-red/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-signal-amber/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-signal-green/60" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-1">terminal</span>
            </div>
            <div className="p-4 font-mono text-sm space-y-1">
              <p><span className="text-muted-foreground">$</span> <span className="text-signal-green">cp</span> .env.example .env</p>
              <p><span className="text-muted-foreground">$</span> <span className="text-signal-green">uv</span> run python -m src.app</p>
              <p className="text-muted-foreground pt-1">🟢 Signalight Scanner started</p>
              <p className="text-muted-foreground">   Monitoring 7 symbols</p>
              <p className="text-muted-foreground">   Scan interval: every 5 min</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
