"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Download, FileText, AlertCircle, BarChart3 } from "lucide-react"

type ExportFormat = "csv" | "json"
type DataType = "signals" | "alerts"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const cardCls = "bg-[#faf9f5] border border-[#f0eee6] rounded-2xl p-6 shadow-[rgba(0,0,0,0.05)_0px_4px_24px]"

export default function DataExportPage() {
  const { user, token } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv")
  const [selectedType, setSelectedType] = useState<DataType>("signals")
  const [message, setMessage] = useState("")

  const options = [
    { type: "signals" as DataType, label: "시그널 내역", desc: "최근 30일 신호 감지 이력", icon: BarChart3 },
    { type: "alerts" as DataType, label: "알람 목록", desc: "설정된 알람 전체 목록", icon: AlertCircle },
  ]

  const handleExport = async () => {
    if (!user?.user_id || !token) return
    setExporting(true)
    try {
      const endpoint = selectedType === "signals"
        ? `/api/export/signals?user_id=${user.user_id}&format=${selectedFormat}`
        : `/api/export/alerts?user_id=${user.user_id}&format=${selectedFormat}`

      const res = await fetch(`${API_BASE}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error("내보내기 실패")

      const data = await res.json()
      const content = selectedFormat === "csv" ? (data.csv || "") : JSON.stringify(data, null, 2)
      const blob = new Blob([content], { type: selectedFormat === "csv" ? "text/csv" : "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${selectedType}_${new Date().toISOString().split("T")[0]}.${selectedFormat}`
      a.click()
      URL.revokeObjectURL(url)
      setMessage("내보내기 완료")
      setTimeout(() => setMessage(""), 3000)
    } catch (e: any) {
      setMessage(e.message || "오류 발생")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f4ed] p-8">
      <div className="max-w-2xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-medium text-[#141413] leading-tight mb-1" style={{ fontFamily: "Georgia, serif" }}>
              데이터 내보내기
            </h1>
            <p className="text-[#87867f] text-sm">시그널과 알람 데이터를 CSV 또는 JSON으로 내보냅니다</p>
          </div>
        </AnimateIn>

        {message && (
          <div className="mb-5 px-4 py-3 bg-[#c96442]/10 border border-[#c96442]/30 rounded-xl text-sm text-[#c96442]">
            {message}
          </div>
        )}

        <AnimateIn from="bottom" delay={60}>
          <div className={`${cardCls} mb-4`}>
            <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-3">데이터 선택</p>
            <div className="space-y-2">
              {options.map(opt => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.type}
                    onClick={() => setSelectedType(opt.type)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      selectedType === opt.type
                        ? "border-[#c96442] bg-[#c96442]/5 shadow-[0px_0px_0px_1px_#c96442]"
                        : "border-[#f0eee6] hover:border-[#e8e6dc]"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${selectedType === opt.type ? "bg-[#c96442] text-[#faf9f5]" : "bg-[#e8e6dc] text-[#5e5d59]"}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#141413]">{opt.label}</p>
                      <p className="text-xs text-[#87867f]">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </AnimateIn>

        <AnimateIn from="bottom" delay={120}>
          <div className={`${cardCls} mb-4`}>
            <p className="text-xs font-medium text-[#87867f] uppercase tracking-wide mb-3">파일 형식</p>
            <div className="flex gap-2">
              {(["csv", "json"] as ExportFormat[]).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedFormat === fmt
                      ? "bg-[#141413] text-[#faf9f5]"
                      : "bg-[#e8e6dc] text-[#4d4c48] hover:bg-[#d1cfc5]"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </AnimateIn>

        <AnimateIn from="bottom" delay={180}>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#c96442] text-[#faf9f5] rounded-xl text-sm font-medium hover:bg-[#b8573b] disabled:opacity-50 transition-colors shadow-[0px_0px_0px_1px_#c96442]"
          >
            <Download size={16} />
            {exporting ? "내보내는 중..." : "지금 내보내기"}
          </button>
        </AnimateIn>
      </div>
    </div>
  )
}
