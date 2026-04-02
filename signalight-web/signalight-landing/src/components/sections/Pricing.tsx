import { Check, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimateIn } from "@/components/layout/AnimateIn"

const FREE_FEATURES = [
  "Up to 5 symbols",
  "All technical signals (RSI, MA, Bollinger, Drawdown)",
  "Telegram alerts + bot commands",
  "Signal history — 7 days",
  "QQQ drawdown strategy",
  "SQLite local storage",
]

const PRO_FEATURES = [
  "Unlimited symbols",
  "Everything in Free",
  "AI news sentiment (Claude API)",
  "Unlimited signal history",
  "Email alerts (Resend)",
  "Web Push notifications",
  "Supabase cloud sync",
  "Web dashboard (PWA)",
  "Priority support",
]

const FAQS = [
  {
    q: "Do I need a server to run Signalight?",
    a: "Phase 1 runs entirely on your local machine (WSL on Windows or any Linux). No server costs during setup and testing.",
  },
  {
    q: "Is the AI news analysis included in Free?",
    a: "AI sentiment analysis (Claude API) is a Pro feature. The Claude API costs roughly $3–10/month depending on usage.",
  },
  {
    q: "Can I self-host the Pro features?",
    a: "Yes. Signalight is open source (MIT). Pro features require your own API keys (Anthropic, Supabase, Resend).",
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <AnimateIn from="bottom">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">
              Start free. Upgrade when you need more.
            </p>
          </div>
        </AnimateIn>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
          {/* Free */}
          <AnimateIn from="bottom" delay={80}>
          <div className="rounded-2xl border border-border bg-card p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-1">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/ forever</span>
              </div>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-signal-green mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full">
              Get Started Free
            </Button>
          </div>
          </AnimateIn>

          {/* Pro */}
          <AnimateIn from="bottom" delay={160}>
          <div className="rounded-2xl border border-signal-green/40 bg-card p-8 flex flex-col relative glow-green">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-signal-green text-black font-semibold px-3">
                <Zap className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-1">Pro</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$9</span>
                <span className="text-muted-foreground">/ month</span>
              </div>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-signal-green mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full bg-signal-green hover:bg-signal-green/90 text-black font-semibold">
              Start Pro
            </Button>
          </div>
          </AnimateIn>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold text-center mb-6">FAQ</h3>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <AnimateIn key={faq.q} from="bottom" delay={i * 80}>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="font-medium text-sm mb-2">{faq.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
