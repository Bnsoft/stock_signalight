"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Save, Bell, Lock, User, Sliders, Database } from "lucide-react"

type SettingsTab = "profile" | "notifications" | "preferences" | "security" | "data"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function SettingsPage() {
  const { user, token } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    name: user?.name || "사용자",
    email: user?.email || "",
    preferred_currency: "USD",
    timezone: "Asia/Seoul",
    language: "ko",
  })
  const [notifications, setNotifications] = useState({
    email_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    telegram_enabled: false,
    discord_enabled: false,
    quiet_hours_enabled: false,
    quiet_hours_start: "21:00",
    quiet_hours_end: "09:00",
  })

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await fetch(`${API_BASE}/api/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      })
    } finally {
      setSaving(false)
    }
  }

  const TabButton = ({ tab, label, icon }: { tab: SettingsTab; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm ${
        activeTab === tab ? "bg-blue-600 text-white" : "bg-muted text-foreground hover:bg-muted/80"
      }`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">설정</h1>
            <p className="text-muted-foreground">계정, 알림, 보안 및 환경 설정 관리</p>
          </div>
        </AnimateIn>

        {/* Tab Navigation */}
        <AnimateIn from="bottom" delay={80}>
          <div className="mb-6 bg-card border border-border rounded-lg p-4 flex gap-2 flex-wrap">
            <TabButton tab="profile" label="프로필" icon={<User size={18} />} />
            <TabButton tab="notifications" label="알림" icon={<Bell size={18} />} />
            <TabButton tab="preferences" label="환경설정" icon={<Sliders size={18} />} />
            <TabButton tab="security" label="보안" icon={<Lock size={18} />} />
            <TabButton tab="data" label="데이터" icon={<Database size={18} />} />
          </div>
        </AnimateIn>

        {/* Content */}
        <AnimateIn from="bottom" delay={160}>
          <div>
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-6">프로필 정보</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 pb-6 border-b border-border">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">프로필 사진</p>
                        <p className="font-semibold">{profile.name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold mb-2">이름</label>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">이메일</label>
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">통화</label>
                        <select
                          value={profile.preferred_currency}
                          onChange={(e) => setProfile({ ...profile, preferred_currency: e.target.value })}
                          className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                        >
                          <option value="USD">미국 달러 (USD)</option>
                          <option value="KRW">한국 원 (KRW)</option>
                          <option value="EUR">유로 (EUR)</option>
                          <option value="JPY">일본 엔 (JPY)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2">시간대</label>
                        <select
                          value={profile.timezone}
                          onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                          className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                        >
                          <option value="America/New_York">미국 동부 (EST)</option>
                          <option value="America/Chicago">미국 중부 (CST)</option>
                          <option value="America/Los_Angeles">미국 서부 (PST)</option>
                          <option value="Europe/London">런던 (GMT)</option>
                          <option value="Asia/Seoul">서울 (KST)</option>
                          <option value="Asia/Tokyo">도쿄 (JST)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
                    >
                      <Save size={18} />
                      {saving ? "저장 중..." : "프로필 저장"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-6">알림 채널</h2>
                  <div className="space-y-4">
                    {[
                      { key: "email_enabled", label: "이메일", icon: "📧" },
                      { key: "push_enabled", label: "푸시 알림", icon: "🔔" },
                      { key: "sms_enabled", label: "SMS", icon: "💬" },
                      { key: "telegram_enabled", label: "텔레그램", icon: "✈️" },
                      { key: "discord_enabled", label: "디스코드", icon: "💜" },
                    ].map((channel) => (
                      <div key={channel.key} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{channel.icon}</span>
                          <span className="font-semibold">{channel.label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={(notifications as any)[channel.key]}
                          onChange={(e) =>
                            setNotifications({ ...notifications, [channel.key]: e.target.checked })
                          }
                          className="w-5 h-5 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-6">조용한 시간대</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <label className="font-semibold">활성화</label>
                      <input
                        type="checkbox"
                        checked={notifications.quiet_hours_enabled}
                        onChange={(e) =>
                          setNotifications({ ...notifications, quiet_hours_enabled: e.target.checked })
                        }
                        className="w-5 h-5 cursor-pointer"
                      />
                    </div>

                    {notifications.quiet_hours_enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold mb-2">시작 시간</label>
                          <input
                            type="time"
                            value={notifications.quiet_hours_start}
                            onChange={(e) =>
                              setNotifications({ ...notifications, quiet_hours_start: e.target.value })
                            }
                            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-2">종료 시간</label>
                          <input
                            type="time"
                            value={notifications.quiet_hours_end}
                            onChange={(e) =>
                              setNotifications({ ...notifications, quiet_hours_end: e.target.value })
                            }
                            className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {saving ? "저장 중..." : "알림 설정 저장"}
                </button>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-6">환경 설정</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">테마</label>
                    <select
                      defaultValue="dark"
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                    >
                      <option value="dark">다크 모드</option>
                      <option value="light">라이트 모드</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">언어</label>
                    <select
                      value={profile.language}
                      onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                      className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                    >
                      <option value="ko">한국어</option>
                      <option value="en">English</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h3 className="font-semibold mb-4">대시보드 설정</h3>
                    <div className="space-y-3">
                      {[
                        { label: "리얼타임 업데이트", checked: true },
                        { label: "음성 알림", checked: false },
                        { label: "자동 새로고침", checked: true },
                      ].map((setting) => (
                        <div key={setting.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span>{setting.label}</span>
                          <input type="checkbox" defaultChecked={setting.checked} className="w-5 h-5 cursor-pointer" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-muted text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
                  >
                    <Save size={18} />
                    {saving ? "저장 중..." : "환경 설정 저장"}
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-6">비밀번호 변경</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">현재 비밀번호</label>
                      <input type="password" placeholder="현재 비밀번호" className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">새 비밀번호</label>
                      <input type="password" placeholder="새 비밀번호" className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">비밀번호 확인</label>
                      <input type="password" placeholder="비밀번호 확인" className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground" />
                    </div>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all">
                      비밀번호 변경
                    </button>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4">2단계 인증</h2>
                  <p className="text-muted-foreground mb-4">계정 보안을 강화하세요</p>
                  <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all">
                    활성화
                  </button>
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === "data" && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-6">데이터 내보내기</h2>
                  <p className="text-muted-foreground mb-4">당신의 모든 데이터를 다운로드하세요</p>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all">
                    데이터 다운로드 (JSON)
                  </button>
                </div>

                <div className="bg-red-600/10 border border-red-600 rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4 text-red-600">계정 삭제</h2>
                  <p className="text-muted-foreground mb-4">주의: 이 작업은 되돌릴 수 없습니다</p>
                  <button className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all">
                    계정 삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}
