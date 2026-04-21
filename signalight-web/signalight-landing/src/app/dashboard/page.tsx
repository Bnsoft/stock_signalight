"use client"

import Link from "next/link"
import { Bell, Calculator, Download, User } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

const tools = [
  { href: "/dashboard/alerts", icon: Bell, label: "알람 관리", desc: "가격·이동평균선·거래량 알람 설정 및 텔레그램 알림" },
  { href: "/dashboard/calculator", icon: Calculator, label: "계산기", desc: "수익률·손익분기·세후 수익 계산" },
  { href: "/dashboard/backtest-calculator", icon: Calculator, label: "백테스트 계산기", desc: "전략 과거 성과 검증 및 분석" },
  { href: "/dashboard/data-export", icon: Download, label: "데이터 내보내기", desc: "시그널·알람 CSV 내보내기" },
  { href: "/dashboard/profile", icon: User, label: "프로필 설정", desc: "계정 정보 및 알림 설정 관리" },
]

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#f5f4ed] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-medium text-[#141413] mb-2 leading-tight"
            style={{ fontFamily: "Georgia, serif" }}>
            안녕하세요, {user?.display_name || "Guest"}
          </h1>
          <p className="text-[#87867f] text-base leading-relaxed">
            Signalight 대시보드에 오신 걸 환영합니다.
          </p>
        </div>

        <div className="space-y-2">
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="flex items-center gap-4 p-5 bg-[#faf9f5] border border-[#f0eee6] rounded-xl hover:border-[#c96442] hover:shadow-[0px_0px_0px_1px_#c96442] transition-all group"
              >
                <div className="p-2.5 bg-[#e8e6dc] rounded-lg text-[#5e5d59] group-hover:bg-[#c96442] group-hover:text-[#faf9f5] transition-all shrink-0">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-medium text-[#141413] text-sm">{tool.label}</p>
                  <p className="text-xs text-[#87867f] mt-0.5 leading-relaxed">{tool.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
