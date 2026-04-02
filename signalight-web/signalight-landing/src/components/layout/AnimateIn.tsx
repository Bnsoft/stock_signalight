"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface AnimateInProps {
  children: React.ReactNode
  className?: string
  delay?: number   // ms
  from?: "bottom" | "left" | "right" | "fade"
}

export function AnimateIn({
  children,
  className,
  delay = 0,
  from = "bottom",
}: AnimateInProps) {
  const ref   = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.12 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const initial: Record<string, string> = {
    bottom: "translate-y-6 opacity-0",
    left:   "-translate-x-6 opacity-0",
    right:  "translate-x-6 opacity-0",
    fade:   "opacity-0",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "translate-y-0 translate-x-0 opacity-100" : initial[from],
        className
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  )
}
