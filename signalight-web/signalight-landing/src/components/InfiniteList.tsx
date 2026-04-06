"use client"

import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import { ReactNode } from "react"
import { Loader } from "lucide-react"

interface InfiniteListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  onLoadMore: () => void | Promise<void>
  hasMore: boolean
  isLoading?: boolean
  className?: string
  loadingIndicator?: ReactNode
  endMessage?: ReactNode
}

export function InfiniteList<T>({
  items,
  renderItem,
  onLoadMore,
  hasMore,
  isLoading = false,
  className = "",
  loadingIndicator,
  endMessage = "더 이상 항목이 없습니다",
}: InfiniteListProps<T>) {
  const { observerTarget, isLoading: isLoadingMore } = useInfiniteScroll({
    onLoadMore,
    hasMore,
  })

  const isActuallyLoading = isLoading || isLoadingMore

  return (
    <div className={className}>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* Observer target for infinite scroll */}
      <div
        ref={observerTarget}
        className="py-4"
      >
        {isActuallyLoading && (
          <div className="flex justify-center py-6">
            {loadingIndicator ? (
              loadingIndicator
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader size={16} className="animate-spin" />
                <span>로딩 중...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {!hasMore && items.length > 0 && (
        <div className="py-6 text-center text-muted-foreground text-sm">
          {endMessage}
        </div>
      )}

      {items.length === 0 && !isActuallyLoading && (
        <div className="py-8 text-center text-muted-foreground">
          항목이 없습니다
        </div>
      )}
    </div>
  )
}
