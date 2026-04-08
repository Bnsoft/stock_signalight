"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Zap, Star, BarChart2, TrendingUp, Search,
  Bell, ShieldAlert, BookOpen, LineChart, Activity,
  Briefcase, Target, PieChart, RotateCcw, Newspaper,
  Globe, Calculator, History, Download, Settings, User,
  ChevronDown, ChevronRight, Menu, X, Radio, LogOut,
  Layers, Wallet, GitBranch,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "메인",
    items: [
      { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
      { href: "/dashboard/ai-signals", label: "시그널 피드", icon: Zap },
      { href: "/dashboard/watchlist", label: "관심종목", icon: Star },
    ],
  },
  {
    label: "분석",
    items: [
      { href: "/dashboard/charts", label: "차트", icon: BarChart2 },
      { href: "/dashboard/screener", label: "스크리너", icon: Search },
      { href: "/dashboard/market-overview", label: "마켓 개요", icon: Globe },
      { href: "/dashboard/sectors", label: "섹터 분석", icon: Layers },
      { href: "/dashboard/compare", label: "종목 비교", icon: GitBranch },
      { href: "/dashboard/news-events", label: "뉴스/이벤트", icon: Newspaper },
    ],
  },
  {
    label: "포트폴리오",
    items: [
      { href: "/dashboard/portfolio", label: "포트폴리오", icon: Briefcase },
      { href: "/dashboard/positions", label: "포지션", icon: Wallet },
      { href: "/dashboard/performance", label: "성과 분석", icon: Activity },
      { href: "/dashboard/portfolio-analysis", label: "심화 분석", icon: PieChart },
      { href: "/dashboard/rebalance", label: "리밸런싱", icon: RotateCcw },
      { href: "/dashboard/goals", label: "투자 목표", icon: Target },
    ],
  },
  {
    label: "거래/전략",
    items: [
      { href: "/dashboard/backtesting", label: "백테스팅", icon: TrendingUp },
      { href: "/dashboard/options", label: "옵션 분석", icon: LineChart },
      { href: "/dashboard/advanced-trading", label: "고급 주문", icon: ShieldAlert },
      { href: "/dashboard/auto-trade", label: "자동매매", icon: BookOpen },
    ],
  },
  {
    label: "도구",
    items: [
      { href: "/dashboard/alerts", label: "알람 관리", icon: Bell },
      { href: "/dashboard/calculator", label: "계산기", icon: Calculator },
      { href: "/dashboard/backtest-calculator", label: "백테스트 계산기", icon: Calculator },
      { href: "/dashboard/data-export", label: "데이터 내보내기", icon: Download },
    ],
  },
  {
    label: "계정",
    items: [
      { href: "/dashboard/profile", label: "프로필", icon: User },
      { href: "/dashboard/settings", label: "설정", icon: Settings },
    ],
  },
]

function NavGroup({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  const isGroupActive = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  )

  return (
    <div className="mb-1">
      {!collapsed && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          {group.label}
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      )}

      {(open || collapsed) && (
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DashboardNav() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-border">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <Radio className="w-5 h-5 text-blue-600" />
            Signalight
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-muted hidden md:flex"
          title={collapsed ? "펼치기" : "접기"}
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_GROUPS.map((group) => (
          <NavGroup key={group.label} group={group} collapsed={collapsed} />
        ))}
      </div>

      {/* User + logout */}
      <div className="border-t border-border p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.display_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email || "guest"}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          )}
          title={collapsed ? "로그아웃" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && "로그아웃"}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-background border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <Radio className="w-5 h-5 text-blue-600" />
          Signalight
        </Link>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-background border-r border-border h-full overflow-hidden z-10">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 h-full border-r border-border bg-background z-40 transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Spacer to push content right of sidebar */}
      <div className={cn("hidden md:block shrink-0 transition-all duration-200", collapsed ? "w-14" : "w-56")} />
    </>
  )
}
