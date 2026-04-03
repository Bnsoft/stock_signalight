"use client"

const SYMBOLS = ["QQQ", "TQQQ", "QLD", "SPY", "SPYI", "QQQI", "JEPQ"]

interface SymbolSelectorProps {
  value: string
  onChange: (symbol: string) => void
}

export function SymbolSelector({ value, onChange }: SymbolSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-border bg-card text-sm font-mono cursor-pointer hover:border-signal-green/50 transition"
    >
      {SYMBOLS.map((symbol) => (
        <option key={symbol} value={symbol}>
          {symbol}
        </option>
      ))}
    </select>
  )
}
