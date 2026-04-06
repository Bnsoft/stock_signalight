"use client"

import { useVirtualScroll } from "@/hooks/useVirtualScroll"
import { ReactNode } from "react"

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number | ((index: number) => number)
  containerHeight: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  overscan?: number
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = "",
  overscan = 3,
}: VirtualListProps<T>) {
  const {
    containerRef,
    virtualItems,
    totalHeight,
    offsetY,
    handleScroll,
  } = useVirtualScroll({
    itemCount: items.length,
    itemHeight,
    containerHeight,
    overscan,
  })

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto ${className}`}
      style={{ height: `${containerHeight}px` }}
    >
      <div style={{ height: `${totalHeight}px` }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {virtualItems.map((virtualItem) => (
            <div key={virtualItem.index}>
              {renderItem(items[virtualItem.index], virtualItem.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
