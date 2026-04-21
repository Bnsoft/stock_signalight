"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { Bell, Calculator, Download, User, Menu, X, LogOut, Radio, ChevronDown, ChevronRight, FileBarChart } from "lucide-react"

interface NavItem { href: string; label: string; icon: React.ComponentType<{ className?: string }> }
interface NavGroup { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: "도구",
    items: [
      { href: "/dashboard/alerts", label: "알람 관리", icon: Bell },
      { href: "/dashboard/reports", label: "리포트", icon: FileBarChart },
      { href: "/dashboard/calculator", label: "계산기", icon: Calculator },
      { href: "/dashboard/backtest-calculator", label: "백테스트 계산기", icon: Calculator },
      { href: "/dashboard/data-export", label: "데이터 내보내기", icon: Download },
    ],
  },
  {
    label: "계정",
    items: [
      { href: "/dashboard/profile", label: "프로필 설정", icon: User },
    ],
  },
]

function NavGroup({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  return (
    <div className="mb-2">
      {!collapsed && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium tracking-widest uppercase text-[#87867f] hover:text-[#5e5d59] transition-colors"
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
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-[#c96442] text-[#faf9f5] shadow-[0px_0px_0px_1px_#c96442]"
                    : "text-[#5e5d59] hover:bg-[#e8e6dc] hover:text-[#141413]"
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

  const handleLogout = () => { logout(); router.push("/") }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#f0eee6]">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#c96442]" />
            <span className="font-serif text-lg font-medium text-[#141413]" style={{ fontFamily: "Georgia, serif" }}>
              Signalight
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-[#e8e6dc] text-[#87867f] hidden md:flex transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {NAV_GROUPS.map((group) => (
          <NavGroup key={group.label} group={group} collapsed={collapsed} />
        ))}
      </div>

      {/* User */}
      <div className="border-t border-[#f0eee6] p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 mb-2 px-2">
            <div className="w-7 h-7 rounded-full bg-[#c96442] flex items-center justify-center text-[#faf9f5] text-xs font-medium shrink-0">
              {user.display_name?.[0]?.toUpperCase() || "G"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#141413] truncate">{user.display_name}</p>
              <p className="text-xs text-[#87867f] truncate">{user.email || "게스트"}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[#87867f] hover:bg-[#e8e6dc] hover:text-[#5e5d59] transition-colors"
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
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-[#f5f4ed] border-b border-[#f0eee6]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-[#c96442]" />
          <span className="font-medium text-[#141413]" style={{ fontFamily: "Georgia, serif" }}>Signalight</span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-[#e8e6dc]">
          <Menu className="w-5 h-5 text-[#5e5d59]" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-[#141413]/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-[#f5f4ed] border-r border-[#f0eee6] h-full overflow-hidden z-10">
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[#e8e6dc]">
              <X className="w-4 h-4 text-[#5e5d59]" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 h-full bg-[#f5f4ed] border-r border-[#f0eee6] z-40 transition-all duration-200",
        collapsed ? "w-14" : "w-56"
      )}>
        {sidebarContent}
      </aside>

      <div className={cn("hidden md:block shrink-0 transition-all duration-200", collapsed ? "w-14" : "w-56")} />
    </>
  )
}
