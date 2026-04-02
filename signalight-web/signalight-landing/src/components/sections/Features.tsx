import { Card, CardContent } from "@/components/ui/card"
import {
  Radio, Bell, BarChart2, Brain, ShieldCheck, RefreshCw,
} from "lucide-react"

const FEATURES = [
  {
    icon: Radio,
    title: "Signal Detection",
    desc: "RSI oversold/overbought, MA Golden/Death Cross, Bollinger Band breakouts, and QQQ drawdown entry levels — all calculated automatically.",
    color: "text-signal-green",
  },
  {
    icon: Bell,
    title: "Telegram Alerts",
    desc: "Signals land on your phone instantly. Two-way bot: send /scan, /price QQQ, /add AAPL, /watchlist from anywhere.",
    color: "text-blue-400",
  },
  {
    icon: BarChart2,
    title: "Live Dashboard",
    desc: "Real-time signal feed, TradingView candlestick charts with MA, RSI, and Bollinger overlays. Desktop + PWA mobile.",
    color: "text-violet-400",
  },
  {
    icon: Brain,
    title: "AI News Analysis",
    desc: "Claude API analyzes news sentiment for each symbol. Bullish/bearish context combined with technical signals for stronger conviction.",
    color: "text-pink-400",
    badge: "Phase 3",
  },
  {
    icon: RefreshCw,
    title: "No Duplicate Alerts",
    desc: "24-hour cooldown per signal type per symbol. You get alerted once — not spammed every 5 minutes for the same condition.",
    color: "text-signal-amber",
  },
  {
    icon: ShieldCheck,
    title: "Private by Default",
    desc: "Your bot, your database, your data. Runs on your machine (WSL/VPS). No third-party servers see your trades.",
    color: "text-emerald-400",
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything you need to trade smarter
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Built for ETF traders who want systematic signals without the noise.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <Card key={f.title} className="bg-card border-border hover:border-border/80 transition-colors">
                <CardContent className="p-6">
                  <div className={`mb-4 ${f.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{f.title}</h3>
                    {f.badge && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
