import { useState, useCallback, useMemo } from "react"

export interface PaginationState {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export function usePagination(initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [totalItems, setTotalItems] = useState(0)

  // 총 페이지 수 계산
  const totalPages = useMemo(
    () => Math.ceil(totalItems / pageSize),
    [totalItems, pageSize]
  )

  // 시작 인덱스
  const startIndex = useMemo(
    () => (currentPage - 1) * pageSize,
    [currentPage, pageSize]
  )

  // 끝 인덱스
  const endIndex = useMemo(
    () => Math.min(startIndex + pageSize, totalItems),
    [startIndex, pageSize, totalItems]
  )

  // 다음 페이지 이동
  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }, [totalPages])

  // 이전 페이지 이동
  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }, [])

  // 특정 페이지로 이동
  const goToPage = useCallback((page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }, [totalPages])

  // 페이지 크기 변경
  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1) // 첫 페이지로 리셋
  }, [])

  // 총 항목 수 설정
  const setTotal = useCallback((total: number) => {
    setTotalItems(total)
    // 현재 페이지가 유효한 범위를 벗어나면 첫 페이지로
    if (currentPage > Math.ceil(total / pageSize)) {
      setCurrentPage(1)
    }
  }, [currentPage, pageSize])

  // 리셋
  const reset = useCallback(() => {
    setCurrentPage(1)
    setPageSize(initialPageSize)
    setTotalItems(0)
  }, [initialPageSize])

  // 페이지 범위 배열 생성
  const pageRange = useMemo(() => {
    const range: number[] = []
    const startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(totalPages, currentPage + 2)

    for (let i = startPage; i <= endPage; i++) {
      range.push(i)
    }

    return range
  }, [currentPage, totalPages])

  const state: PaginationState = {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
  }

  const actions = {
    nextPage,
    prevPage,
    goToPage,
    changePageSize,
    setTotal,
    reset,
  }

  const info = {
    startIndex,
    endIndex,
    pageRange,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    itemsInCurrentPage: endIndex - startIndex,
  }

  return {
    ...state,
    ...actions,
    ...info,
  }
}
