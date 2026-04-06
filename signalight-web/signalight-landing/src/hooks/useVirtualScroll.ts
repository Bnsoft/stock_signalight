import { useState, useCallback, useEffect, useRef } from "react"

interface UseVirtualScrollOptions {
  itemCount: number
  itemHeight: number | ((index: number) => number)
  containerHeight: number
  overscan?: number // Number of items to render outside visible area
}

interface VirtualItem {
  index: number
  offset: number
}

export function useVirtualScroll(options: UseVirtualScrollOptions) {
  const {
    itemCount,
    itemHeight,
    containerHeight,
    overscan = 3,
  } = options

  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate total height
  const getTotalHeight = useCallback((): number => {
    if (typeof itemHeight === "number") {
      return itemCount * itemHeight
    }

    let total = 0
    for (let i = 0; i < itemCount; i++) {
      total += itemHeight(i)
    }
    return total
  }, [itemCount, itemHeight])

  // Get item height
  const getItemHeight = useCallback(
    (index: number): number => {
      return typeof itemHeight === "number" ? itemHeight : itemHeight(index)
    },
    [itemHeight]
  )

  // Get offset of item at index
  const getItemOffset = useCallback(
    (index: number): number => {
      if (typeof itemHeight === "number") {
        return index * itemHeight
      }

      let offset = 0
      for (let i = 0; i < index; i++) {
        offset += itemHeight(i)
      }
      return offset
    },
    [itemHeight]
  )

  // Get index at scroll position
  const getIndexAtScrollPosition = useCallback(
    (scrollPos: number): number => {
      if (typeof itemHeight === "number") {
        return Math.floor(scrollPos / itemHeight)
      }

      let offset = 0
      for (let i = 0; i < itemCount; i++) {
        offset += itemHeight(i)
        if (offset > scrollPos) {
          return i
        }
      }
      return Math.max(0, itemCount - 1)
    },
    [itemCount, itemHeight]
  )

  // Calculate visible range
  const visibleStartIndex = Math.max(0, getIndexAtScrollPosition(scrollTop) - overscan)
  const visibleEndIndex = Math.min(
    itemCount,
    getIndexAtScrollPosition(scrollTop + containerHeight) + overscan
  )

  // Create virtual items
  const virtualItems: VirtualItem[] = []
  for (let i = visibleStartIndex; i < visibleEndIndex; i++) {
    virtualItems.push({
      index: i,
      offset: getItemOffset(i),
    })
  }

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      setScrollTop(target.scrollTop)
    },
    []
  )

  // Handle scroll to index
  const scrollToIndex = useCallback(
    (index: number, align: "start" | "center" | "end" = "start") => {
      if (!containerRef.current) return

      const offset = getItemOffset(index)
      const itemH = getItemHeight(index)

      let scrollPos = offset

      if (align === "center") {
        scrollPos = offset - (containerHeight - itemH) / 2
      } else if (align === "end") {
        scrollPos = offset - (containerHeight - itemH)
      }

      containerRef.current.scrollTop = Math.max(0, scrollPos)
    },
    [containerHeight, getItemOffset, getItemHeight]
  )

  const totalHeight = getTotalHeight()
  const offsetY = visibleStartIndex > 0 ? getItemOffset(visibleStartIndex) : 0
  const contentHeight = virtualItems.reduce((sum, item) => sum + getItemHeight(item.index), 0)

  return {
    containerRef,
    virtualItems,
    totalHeight,
    offsetY,
    contentHeight,
    scrollTop,
    handleScroll,
    scrollToIndex,
  }
}
