"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { PaginationState } from "@/hooks/usePagination"

interface PaginationProps {
  state: PaginationState
  pageRange: number[]
  hasNextPage: boolean
  hasPrevPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onGoToPage: (page: number) => void
  onChangePageSize?: (size: number) => void
  pageSizeOptions?: number[]
}

export function Pagination({
  state,
  pageRange,
  hasNextPage,
  hasPrevPage,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  onChangePageSize,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          페이지 {state.currentPage} / {state.totalPages}
        </span>
        <span>•</span>
        <span>
          총 {state.totalItems}개
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Page Size Selector */}
        {onChangePageSize && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">표시:</label>
            <select
              value={state.pageSize}
              onChange={(e) => onChangePageSize(Number(e.target.value))}
              className="px-2 py-1 bg-muted border border-border rounded text-sm text-foreground"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}개
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Number Buttons */}
        <div className="flex items-center gap-1">
          {pageRange.map((page) => (
            <button
              key={page}
              onClick={() => onGoToPage(page)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                page === state.currentPage
                  ? "bg-blue-600 text-white"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={onPreviousPage}
          disabled={!hasPrevPage}
          className="p-1 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="이전 페이지"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="p-1 hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="다음 페이지"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
