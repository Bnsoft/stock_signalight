import { useRef, useCallback, useEffect, useState } from "react"

interface UseInfiniteScrollOptions {
  threshold?: number // Default 0.1 (10% of element visible)
  onLoadMore?: () => void | Promise<void>
  hasMore?: boolean
}

export function useInfiniteScroll(options?: UseInfiniteScrollOptions) {
  const {
    threshold = 0.1,
    onLoadMore,
    hasMore = true,
  } = options || {}

  const observerTarget = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasMore || !onLoadMore) return

    setIsLoading(true)
    try {
      await onLoadMore()
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, onLoadMore])

  useEffect(() => {
    if (!observerTarget.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !isLoading) {
          handleLoadMore()
        }
      },
      {
        threshold,
      }
    )

    observer.observe(observerTarget.current)

    return () => {
      observer.disconnect()
    }
  }, [threshold, hasMore, isLoading, handleLoadMore])

  return {
    observerTarget,
    isLoading,
  }
}
