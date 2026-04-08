import { useState, useCallback, useRef, useEffect } from "react"

export interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // 밀리초 단위
}

interface CacheConfig {
  maxSize?: number // 최대 캐시 항목 수
  defaultTTL?: number // 기본 TTL (밀리초)
}

export function useCache<T>(config?: CacheConfig) {
  const defaultTTL = config?.defaultTTL || 5 * 60 * 1000 // 기본 5분
  const maxSize = config?.maxSize || 100
  const cacheRef = useRef<Map<string, CacheItem<T>>>(new Map())
  const [cacheSize, setCacheSize] = useState(0)

  // 캐시 키 생성
  const generateKey = useCallback((key: string): string => {
    return `cache_${key}`
  }, [])

  // 캐시에서 데이터 가져오기
  const get = useCallback(
    (key: string): T | null => {
      const cacheKey = generateKey(key)
      const item = cacheRef.current.get(cacheKey)

      if (!item) return null

      // TTL 확인
      if (Date.now() - item.timestamp > item.ttl) {
        cacheRef.current.delete(cacheKey)
        setCacheSize(cacheRef.current.size)
        return null
      }

      return item.data
    },
    [generateKey]
  )

  // 캐시에 데이터 저장
  const set = useCallback(
    (key: string, data: T, ttl = defaultTTL) => {
      const cacheKey = generateKey(key)

      // 최대 크기 확인
      if (
        cacheRef.current.size >= maxSize &&
        !cacheRef.current.has(cacheKey)
      ) {
        // 가장 오래된 항목 제거 (FIFO)
        const firstKey = cacheRef.current.keys().next().value
        if (firstKey !== undefined) cacheRef.current.delete(firstKey)
      }

      cacheRef.current.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
      })

      setCacheSize(cacheRef.current.size)
    },
    [generateKey, defaultTTL, maxSize]
  )

  // 특정 캐시 제거
  const remove = useCallback((key: string) => {
    const cacheKey = generateKey(key)
    cacheRef.current.delete(cacheKey)
    setCacheSize(cacheRef.current.size)
  }, [generateKey])

  // 전체 캐시 초기화
  const clear = useCallback(() => {
    cacheRef.current.clear()
    setCacheSize(0)
  }, [])

  // 캐시 존재 여부 확인
  const has = useCallback(
    (key: string): boolean => {
      return get(key) !== null
    },
    [get]
  )

  // 만료된 항목 정리
  const cleanup = useCallback(() => {
    const now = Date.now()
    let removed = 0

    for (const [key, item] of cacheRef.current.entries()) {
      if (now - item.timestamp > item.ttl) {
        cacheRef.current.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      setCacheSize(cacheRef.current.size)
    }
  }, [])

  // 주기적으로 정리
  useEffect(() => {
    const interval = setInterval(cleanup, 60 * 1000) // 1분마다 정리
    return () => clearInterval(interval)
  }, [cleanup])

  return {
    get,
    set,
    remove,
    clear,
    has,
    cleanup,
    size: cacheSize,
  }
}
