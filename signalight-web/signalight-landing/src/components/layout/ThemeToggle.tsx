"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />

  const options = [
    { value: "light",  icon: Sun,     label: "Light" },
    { value: "dark",   icon: Moon,    label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ] as const

  const current = options.find((o) => o.value === theme) ?? options[2]
  const Icon = current.icon

  const cycle = () => {
    const idx = options.findIndex((o) => o.value === theme)
    setTheme(options[(idx + 1) % options.length].value)
  }

  return (
    <button
      onClick={cycle}
      aria-label={`Switch theme (current: ${current.label})`}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{current.label}</span>
    </button>
  )
}
