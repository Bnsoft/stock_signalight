"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { LogOut, User } from "lucide-react"

interface UserProfile {
  user: { id: string; email?: string; display_name: string; auth_method: string; created_at: string }
  preferences: { theme: string; notification_email: boolean; subscription_plan: string }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const inputCls = "w-full px-4 py-2.5 bg-white border border-[#f0eee6] rounded-xl text-sm text-[#141413] placeholder:text-[#b0aea5] focus:outline-none focus:border-[#3898ec] focus:ring-1 focus:ring-[#3898ec] transition-colors"
const labelCls = "block text-xs font-medium text-[#87867f] mb-1.5 uppercase tracking-wide"

export default function ProfilePage() {
  const { user, token, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.user_id || !token) { setLoading(false); return }
    fetch(`${API_BASE}/api/user/${user.user_id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setProfile).catch(() => {}).finally(() => setLoading(false))
  }, [user, token])

  if (loading) return (
    <div className="min-h-screen bg-[#f5f4ed] p-8 flex items-center justify-center">
      <p className="text-[#87867f]">로딩 중...</p>
    </div>
  )

  const p = profile?.user
  const prefs = profile?.preferences

  return (
    <div className="min-h-screen bg-[#f5f4ed] p-8">
      <div className="max-w-xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-medium text-[#141413] leading-tight mb-1"
              style={{ fontFamily: "Georgia, serif" }}>프로필 설정</h1>
            <p className="text-[#87867f] text-sm">계정 정보를 확인하고 관리합니다</p>
          </div>
        </AnimateIn>

        {/* Avatar + info */}
        <AnimateIn from="bottom" delay={60}>
          <div className="bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-6 mb-4 shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-[#c96442] flex items-center justify-center text-[#faf9f5] text-xl font-medium shrink-0">
                {p?.display_name?.[0]?.toUpperCase() || <User size={22} />}
              </div>
              <div>
                <p className="text-lg font-medium text-[#141413]">{p?.display_name || "—"}</p>
                <p className="text-sm text-[#87867f]">{p?.email || "게스트 계정"}</p>
              </div>
              <span className="ml-auto px-3 py-1 bg-[#e8e6dc] rounded-full text-xs text-[#5e5d59] font-medium">
                {p?.auth_method === "password" ? "이메일" : p?.auth_method || "guest"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-5 border-t border-[#f0eee6]">
              <div>
                <p className={labelCls}>가입일</p>
                <p className="text-sm text-[#141413]">
                  {p?.created_at ? new Date(p.created_at).toLocaleDateString("ko-KR") : "—"}
                </p>
              </div>
              <div>
                <p className={labelCls}>사용자 ID</p>
                <p className="text-sm text-[#141413] font-mono">{p?.id?.slice(0, 8) || "—"}...</p>
              </div>
              <div>
                <p className={labelCls}>플랜</p>
                <p className="text-sm text-[#141413] capitalize">{prefs?.subscription_plan || "guest"}</p>
              </div>
              <div>
                <p className={labelCls}>이메일 알림</p>
                <p className="text-sm text-[#141413]">{prefs?.notification_email ? "켜짐" : "꺼짐"}</p>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Guest notice */}
        {prefs?.subscription_plan === "guest" && (
          <AnimateIn from="bottom" delay={120}>
            <div className="bg-[#faf9f5] border border-[#e8e6dc] rounded-xl p-4 mb-4 text-sm text-[#5e5d59] leading-relaxed">
              게스트 모드입니다. 계정을 만들면 데이터가 영구적으로 저장됩니다.
            </div>
          </AnimateIn>
        )}

        {/* Logout */}
        <AnimateIn from="bottom" delay={180}>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#e8e6dc] hover:bg-[#d1cfc5] text-[#4d4c48] rounded-xl text-sm font-medium transition-colors shadow-[0px_0px_0px_1px_#d1cfc5]"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </AnimateIn>
      </div>
    </div>
  )
}
