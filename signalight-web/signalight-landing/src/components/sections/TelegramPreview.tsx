const CONVERSATION = [
  {
    from: "user",
    text: "/price QQQ",
  },
  {
    from: "bot",
    text: `📈 QQQ — Invesco QQQ
──────────────────
Price:  $584.31
──────────────────
MA20:   $590.17
MA60:   $606.18
RSI:    46.5
MACD:   -3.21 (Signal: -2.84)
──────────────────
Drawdown: -7.9% from ATH ($634.81)
Bollinger: $570.40 — $608.90
Volume:  1.08× avg`,
  },
  { from: "user", text: "/scan" },
  {
    from: "bot",
    text: `⏳ Running scan...

📊 Scan Complete — 7 symbols
✅ No signals triggered
Next scan: 5 min`,
  },
]

const COMMANDS = ["/scan", "/price QQQ", "/signals", "/watchlist", "/add AAPL", "/report", "/help"]

export function TelegramPreview() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <span className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-3 block">
              Telegram Bot
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Control from your phone
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Signalight is a two-way Telegram bot. It alerts you when signals fire,
              and you can control the scanner with simple commands — no app install needed.
            </p>

            {/* Command chips */}
            <div className="flex flex-wrap gap-2">
              {COMMANDS.map((cmd) => (
                <span
                  key={cmd}
                  className="text-xs font-mono px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-blue-400/40 transition-colors cursor-default"
                >
                  {cmd}
                </span>
              ))}
            </div>
          </div>

          {/* Right — Telegram UI mock */}
          <div className="max-w-sm mx-auto w-full">
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/40">
                <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-base">
                  📡
                </div>
                <div>
                  <p className="text-sm font-medium">Signalight Bot</p>
                  <p className="text-xs text-signal-green">● online</p>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-3 min-h-[320px]">
                {CONVERSATION.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] text-xs font-mono whitespace-pre-wrap leading-relaxed ${
                        msg.from === "user"
                          ? "bg-blue-500/80 text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input bar */}
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2.5">
                  <span className="text-xs text-muted-foreground flex-1">Message...</span>
                  <div className="w-7 h-7 rounded-full bg-blue-500/80 flex items-center justify-center">
                    <span className="text-white text-xs">↑</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
