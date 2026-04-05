"use client"

import { useState } from "react"
import { Widget, DashboardLayout, useDashboardLayout } from "@/hooks/useDashboardLayout"
import { Settings, Save, RotateCcw, Plus, Trash2, Check } from "lucide-react"

interface DashboardCustomizerProps {
  onClose: () => void
}

export function DashboardCustomizer({ onClose }: DashboardCustomizerProps) {
  const {
    layouts,
    currentLayout,
    createLayout,
    deleteLayout,
    selectLayout,
    toggleWidget,
    reorderWidget,
    resizeWidget,
    resetToDefault,
    saveLayout,
  } = useDashboardLayout()

  const [newLayoutName, setNewLayoutName] = useState("")
  const [showNewLayout, setShowNewLayout] = useState(false)

  const handleCreateLayout = () => {
    if (newLayoutName.trim()) {
      createLayout(newLayoutName)
      setNewLayoutName("")
      setShowNewLayout(false)
    }
  }

  if (!currentLayout) return null

  const enabledWidgets = currentLayout.widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-6 max-w-4xl w-full max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings size={24} />
            <h2 className="text-2xl font-bold">대시보드 커스터마이징</h2>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* 레이아웃 관리 */}
          <div className="col-span-1 border-r border-border pr-6">
            <h3 className="font-bold mb-4">저장된 레이아웃</h3>
            <div className="space-y-2 mb-4">
              {layouts.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => selectLayout(layout.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                    currentLayout.id === layout.id
                      ? "bg-blue-600 text-white"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{layout.name}</span>
                    {layout.isDefault && <span className="text-xs">기본</span>}
                  </div>
                </button>
              ))}
            </div>

            {showNewLayout ? (
              <div className="space-y-2 mb-4 pb-4 border-t border-border pt-4">
                <input
                  type="text"
                  value={newLayoutName}
                  onChange={(e) => setNewLayoutName(e.target.value)}
                  placeholder="레이아웃 이름"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateLayout}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 rounded"
                  >
                    생성
                  </button>
                  <button
                    onClick={() => {
                      setShowNewLayout(false)
                      setNewLayoutName("")
                    }}
                    className="flex-1 bg-muted hover:bg-muted/80 text-sm py-1 rounded"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewLayout(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-semibold mb-4"
              >
                <Plus size={16} />
                새 레이아웃
              </button>
            )}

            <div className="space-y-2">
              {currentLayout.id !== "default" && (
                <button
                  onClick={() => deleteLayout(currentLayout.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-600 text-sm font-semibold"
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              )}
              <button
                onClick={resetToDefault}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-semibold"
              >
                <RotateCcw size={16} />
                기본으로 리셋
              </button>
            </div>
          </div>

          {/* 위젯 관리 */}
          <div className="col-span-2">
            <h3 className="font-bold mb-4">사용 가능한 위젯</h3>
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {currentLayout.widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={widget.enabled}
                      onChange={() => toggleWidget(widget.id)}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{widget.name}</p>
                      <p className="text-xs text-muted-foreground">{widget.id}</p>
                    </div>
                  </div>
                  <select
                    value={widget.size}
                    onChange={(e) => resizeWidget(widget.id, e.target.value as any)}
                    className="px-2 py-1 bg-background border border-border rounded text-xs font-semibold"
                  >
                    <option value="small">소</option>
                    <option value="medium">중</option>
                    <option value="large">대</option>
                  </select>
                </div>
              ))}
            </div>

            {/* 요약 */}
            <div className="bg-blue-600/10 border border-blue-600 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-600 mb-2">
                활성화된 위젯: {enabledWidgets.length}개 / {currentLayout.widgets.length}개
              </p>
              <div className="flex flex-wrap gap-2">
                {enabledWidgets.map((w) => (
                  <span key={w.id} className="inline-block px-2 py-1 bg-blue-600/20 rounded text-xs">
                    {w.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 mt-6 pt-6 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} />
            완료
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg transition-all"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
