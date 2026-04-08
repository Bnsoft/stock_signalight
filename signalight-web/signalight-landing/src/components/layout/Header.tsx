"use client"

import { useState, useEffect } from "react"
import { Menu, X, Radio } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { label: "Features",     href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Strategy",     href: "#strategy" },
  { label: "Pricing",      href: "#pricing" },
  { label: "DB Status",    href: "/test-supabase" },
]

export function Header() {
  const [open, setOpen]       = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 font-semibold text-lg">
          <Radio className="w-5 h-5 text-signal-green" />
          <span>Signalight</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href="/auth/login">
            <Button size="sm" className="hidden sm:flex bg-signal-green hover:bg-signal-green/90 text-black font-semibold">
              Get Started
            </Button>
          </a>
          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-border px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Button className="mt-2 bg-signal-green hover:bg-signal-green/90 text-black font-semibold">
              Get Started
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
