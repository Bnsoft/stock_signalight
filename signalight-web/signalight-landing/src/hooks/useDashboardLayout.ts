import { useState, useEffect, useCallback } from "react"

export interface Widget {
  id: string
  name: string
  enabled: boolean
  order: number
  size: "small" | "medium" | "large"
}

export interface DashboardLayout {
  id: string
  name: string
  widgets: Widget[]
  createdAt: string
  updatedAt: string
  isDefault: boolean
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: "portfolio-summary", name: "포트폴리오 요약", enabled: true, order: 1, size: "large" },
  { id: "market-stats", name: "시장 통계", enabled: true, order: 2, size: "medium" },
  { id: "recent-alerts", name: "최근 알람", enabled: true, order: 3, size: "medium" },
  { id: "top-gainers", name: "상승 종목", enabled: true, order: 4, size: "small" },
  { id: "top-losers", name: "하락 종목", enabled: true, order: 5, size: "small" },
  { id: "watchlist", name: "관심 종목", enabled: true, order: 6, size: "large" },
  { id: "sector-performance", name: "섹터 성과", enabled: true, order: 7, size: "medium" },
  { id: "price-chart", name: "차트", enabled: false, order: 8, size: "large" },
  { id: "economic-calendar", name: "경제 캘린더", enabled: false, order: 9, size: "medium" },
  { id: "options-chain", name: "옵션 체인", enabled: false, order: 10, size: "large" },
]

export function useDashboardLayout() {
  const [layouts, setLayouts] = useState<DashboardLayout[]>([])
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout | null>(null)
  const [loading, setLoading] = useState(true)

  // 로컬 스토리지에서 로드
  useEffect(() => {
    const loadLayout = () => {
      try {
        const saved = localStorage.getItem("dashboardLayouts")
        if (saved) {
          const parsed = JSON.parse(saved)
          setLayouts(parsed)
          const defaultLayout = parsed.find((l: DashboardLayout) => l.isDefault)
          if (defaultLayout) {
            setCurrentLayout(defaultLayout)
          }
        } else {
          // 기본 레이아웃 생성
          const defaultLayout: DashboardLayout = {
            id: "default",
            name: "기본",
            widgets: DEFAULT_WIDGETS,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDefault: true,
          }
          setLayouts([defaultLayout])
          setCurrentLayout(defaultLayout)
        }
      } catch (error) {
        console.error("Failed to load layout:", error)
      } finally {
        setLoading(false)
      }
    }

    loadLayout()
  }, [])

  // 레이아웃 저장
  const saveLayout = useCallback(
    (layout: DashboardLayout) => {
      try {
        const updated = layouts.map((l) =>
          l.id === layout.id ? { ...layout, updatedAt: new Date().toISOString() } : l
        )
        setLayouts(updated)
        localStorage.setItem("dashboardLayouts", JSON.stringify(updated))
        setCurrentLayout(layout)
        return true
      } catch (error) {
        console.error("Failed to save layout:", error)
        return false
      }
    },
    [layouts]
  )

  // 새 레이아웃 생성
  const createLayout = useCallback(
    (name: string) => {
      const newLayout: DashboardLayout = {
        id: `layout-${Date.now()}`,
        name,
        widgets: currentLayout?.widgets || DEFAULT_WIDGETS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: false,
      }
      const updated = [...layouts, newLayout]
      setLayouts(updated)
      localStorage.setItem("dashboardLayouts", JSON.stringify(updated))
      return newLayout
    },
    [layouts, currentLayout]
  )

  // 레이아웃 삭제
  const deleteLayout = useCallback(
    (layoutId: string) => {
      const updated = layouts.filter((l) => l.id !== layoutId)
      setLayouts(updated)
      localStorage.setItem("dashboardLayouts", JSON.stringify(updated))
      if (currentLayout?.id === layoutId) {
        setCurrentLayout(updated[0] || null)
      }
    },
    [layouts, currentLayout]
  )

  // 레이아웃 선택
  const selectLayout = useCallback((layoutId: string) => {
    const layout = layouts.find((l) => l.id === layoutId)
    if (layout) {
      setCurrentLayout(layout)
    }
  }, [layouts])

  // 위젯 토글
  const toggleWidget = useCallback(
    (widgetId: string) => {
      if (!currentLayout) return

      const updated = {
        ...currentLayout,
        widgets: currentLayout.widgets.map((w) =>
          w.id === widgetId ? { ...w, enabled: !w.enabled } : w
        ),
      }
      saveLayout(updated)
    },
    [currentLayout, saveLayout]
  )

  // 위젯 순서 변경
  const reorderWidget = useCallback(
    (widgetId: string, newOrder: number) => {
      if (!currentLayout) return

      const widgets = [...currentLayout.widgets]
      const widget = widgets.find((w) => w.id === widgetId)
      if (!widget) return

      widgets.sort((a, b) => a.order - b.order)
      const oldIndex = widgets.findIndex((w) => w.id === widgetId)
      const newIndex = Math.min(Math.max(newOrder, 0), widgets.length - 1)

      if (oldIndex !== newIndex) {
        const [removed] = widgets.splice(oldIndex, 1)
        widgets.splice(newIndex, 0, removed)

        const updated = {
          ...currentLayout,
          widgets: widgets.map((w, i) => ({ ...w, order: i + 1 })),
        }
        saveLayout(updated)
      }
    },
    [currentLayout, saveLayout]
  )

  // 위젯 크기 변경
  const resizeWidget = useCallback(
    (widgetId: string, size: "small" | "medium" | "large") => {
      if (!currentLayout) return

      const updated = {
        ...currentLayout,
        widgets: currentLayout.widgets.map((w) =>
          w.id === widgetId ? { ...w, size } : w
        ),
      }
      saveLayout(updated)
    },
    [currentLayout, saveLayout]
  )

  // 기본 레이아웃으로 리셋
  const resetToDefault = useCallback(() => {
    const defaultLayout: DashboardLayout = {
      id: "default",
      name: "기본",
      widgets: DEFAULT_WIDGETS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: true,
    }
    saveLayout(defaultLayout)
  }, [saveLayout])

  return {
    layouts,
    currentLayout,
    loading,
    saveLayout,
    createLayout,
    deleteLayout,
    selectLayout,
    toggleWidget,
    reorderWidget,
    resizeWidget,
    resetToDefault,
  }
}
