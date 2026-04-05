"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Download, FileText, Calendar, BarChart3, AlertCircle } from "lucide-react"

type ExportFormat = "csv" | "excel" | "pdf" | "json"
type DataType = "portfolio" | "backtest" | "alerts" | "transactions" | "monthly" | "annual"

interface ExportOption {
  dataType: DataType
  label: string
  description: string
  formats: ExportFormat[]
  icon: React.ReactNode
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function DataExportPage() {
  const { user, token } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("csv")
  const [selectedDataType, setSelectedDataType] = useState<DataType>("portfolio")
  const [monthYear, setMonthYear] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
  const [year, setYear] = useState(String(new Date().getFullYear()))

  const exportOptions: ExportOption[] = [
    {
      dataType: "portfolio",
      label: "포트폴리오",
      description: "현재 포트폴리오의 포지션 정보를 내보내기",
      formats: ["csv", "excel", "pdf"],
      icon: <BarChart3 size={32} />,
    },
    {
      dataType: "backtest",
      label: "백테스트 결과",
      description: "전략 백테스트 결과 및 성과 지표",
      formats: ["csv", "excel", "json"],
      icon: <FileText size={32} />,
    },
    {
      dataType: "alerts",
      label: "알람",
      description: "생성된 알람 목록 및 이력",
      formats: ["csv", "excel"],
      icon: <AlertCircle size={32} />,
    },
    {
      dataType: "transactions",
      label: "거래 이력",
      description: "모든 거래 내역 및 주문 기록",
      formats: ["csv", "excel"],
      icon: <FileText size={32} />,
    },
    {
      dataType: "monthly",
      label: "월간 리포트",
      description: "특정 월의 성과 분석 리포트",
      formats: ["csv", "excel", "pdf", "json"],
      icon: <Calendar size={32} />,
    },
    {
      dataType: "annual",
      label: "연간 리포트",
      description: "1년 동안의 종합 성과 리포트",
      formats: ["csv", "excel", "pdf", "json"],
      icon: <Calendar size={32} />,
    },
  ]

  const handleExport = async () => {
    if (!token) return

    setExporting(true)
    try {
      let endpoint = ""
      let filename = ""

      switch (selectedDataType) {
        case "portfolio":
          endpoint = `/api/export/portfolio?format=${selectedFormat}`
          filename = `portfolio_${new Date().toISOString().split('T')[0]}.${getFileExtension(selectedFormat)}`
          break
        case "backtest":
          endpoint = `/api/export/backtest?format=${selectedFormat}`
          filename = `backtest_${new Date().toISOString().split('T')[0]}.${getFileExtension(selectedFormat)}`
          break
        case "alerts":
          endpoint = `/api/export/alerts?format=${selectedFormat}`
          filename = `alerts_${new Date().toISOString().split('T')[0]}.${getFileExtension(selectedFormat)}`
          break
        case "transactions":
          endpoint = `/api/export/transactions?format=${selectedFormat}`
          filename = `transactions_${new Date().toISOString().split('T')[0]}.${getFileExtension(selectedFormat)}`
          break
        case "monthly":
          const [monthExportYear, monthExportMonth] = monthYear.split('-')
          endpoint = `/api/export/monthly-report?year=${monthExportYear}&month=${monthExportMonth}&format=${selectedFormat}`
          filename = `monthly_report_${monthYear}.${getFileExtension(selectedFormat)}`
          break
        case "annual":
          endpoint = `/api/export/annual-report?year=${year}&format=${selectedFormat}`
          filename = `annual_report_${year}.${getFileExtension(selectedFormat)}`
          break
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error("Export failed:", res.status)
      }
    } catch (err) {
      console.error("Export error:", err)
    } finally {
      setExporting(false)
    }
  }

  const getFileExtension = (format: ExportFormat) => {
    switch (format) {
      case "csv":
        return "csv"
      case "excel":
        return "xlsx"
      case "pdf":
        return "pdf"
      case "json":
        return "json"
      default:
        return "txt"
    }
  }

  const selectedOption = exportOptions.find((opt) => opt.dataType === selectedDataType)
  const isFormatSupported = selectedOption?.formats.includes(selectedFormat) ?? false

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">데이터 내보내기</h1>
              <p className="text-muted-foreground">
                포트폴리오, 백테스트 결과, 알람 등을 다양한 형식으로 내보내기
              </p>
            </div>
          </div>
        </AnimateIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Export Options */}
          <AnimateIn from="bottom" delay={80}>
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">내보낼 데이터 선택</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exportOptions.map((option) => (
                    <button
                      key={option.dataType}
                      onClick={() => {
                        setSelectedDataType(option.dataType)
                        // Set default format to first available format
                        if (!option.formats.includes(selectedFormat)) {
                          setSelectedFormat(option.formats[0])
                        }
                      }}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedDataType === option.dataType
                          ? "border-blue-600 bg-blue-600/10"
                          : "border-border hover:border-blue-400"
                      }`}
                    >
                      <div className="text-blue-600 mb-2">{option.icon}</div>
                      <h3 className="font-bold text-foreground mb-1">{option.label}</h3>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Selection */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">내보내기 형식</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-3">파일 형식</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {["csv", "excel", "pdf", "json"].map((format) => {
                        const isSupported = selectedOption?.formats.includes(format as ExportFormat) ?? false
                        return (
                          <button
                            key={format}
                            onClick={() => setSelectedFormat(format as ExportFormat)}
                            disabled={!isSupported}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                              selectedFormat === format && isSupported
                                ? "bg-blue-600 text-white"
                                : isSupported
                                ? "bg-muted text-foreground hover:bg-muted/80"
                                : "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                            }`}
                          >
                            {format.toUpperCase()}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Date Selection for Reports */}
                  {selectedDataType === "monthly" && (
                    <div>
                      <label className="block text-sm font-semibold mb-2">월 선택</label>
                      <input
                        type="month"
                        value={monthYear}
                        onChange={(e) => setMonthYear(e.target.value)}
                        className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                      />
                    </div>
                  )}

                  {selectedDataType === "annual" && (
                    <div>
                      <label className="block text-sm font-semibold mb-2">연도 선택</label>
                      <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        min="2020"
                        max={new Date().getFullYear()}
                        className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AnimateIn>

          {/* Export Summary */}
          <AnimateIn from="bottom" delay={160}>
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-card border border-border rounded-lg p-6 sticky top-6">
                <h2 className="text-xl font-bold mb-4">내보내기 요약</h2>
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">데이터 타입</p>
                    <p className="font-bold text-foreground">{selectedOption?.label}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">파일 형식</p>
                    <p className="font-bold text-foreground">{selectedFormat.toUpperCase()}</p>
                  </div>
                  {selectedDataType === "monthly" && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">대상 월</p>
                      <p className="font-bold text-foreground">{monthYear}</p>
                    </div>
                  )}
                  {selectedDataType === "annual" && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">대상 연도</p>
                      <p className="font-bold text-foreground">{year}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">생성 시간</p>
                    <p className="font-bold text-foreground">지금</p>
                  </div>
                </div>

                <button
                  onClick={handleExport}
                  disabled={exporting || !isFormatSupported}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  {exporting ? "내보내는 중..." : "지금 내보내기"}
                </button>
              </div>

              {/* Format Info */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-bold mb-3">파일 형식 정보</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">CSV:</span> 엑셀 및 다른 프로그램과 호환
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Excel:</span> 서식과 함께 스프레드시트 형식
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">PDF:</span> 인쇄 가능한 문서 형식
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">JSON:</span> 프로그래밍 및 API 통합용
                  </p>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>

        {/* Export History */}
        <AnimateIn from="bottom" delay={240}>
          <div className="mt-8 bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">최근 내보내기</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Download size={16} className="text-muted-foreground" />
                  <div>
                    <p className="font-semibold">portfolio_2026-04-05.csv</p>
                    <p className="text-xs text-muted-foreground">포트폴리오 (CSV)</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">2분 전</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Download size={16} className="text-muted-foreground" />
                  <div>
                    <p className="font-semibold">monthly_report_2026-04.pdf</p>
                    <p className="text-xs text-muted-foreground">월간 리포트 (PDF)</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">1시간 전</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Download size={16} className="text-muted-foreground" />
                  <div>
                    <p className="font-semibold">annual_report_2025.json</p>
                    <p className="text-xs text-muted-foreground">연간 리포트 (JSON)</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">3일 전</span>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}
