interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private maxSize: number = 200
  private defaultTTL: number = 5 * 60 * 1000 // 5 minutes

  constructor(maxSize = 200, defaultTTL = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL

    // Periodic cleanup
    setInterval(() => this.cleanup(), 60 * 1000)
  }

  private generateKey(url: string, options?: Record<string, any>): string {
    if (!options) return url
    const optionsStr = JSON.stringify(options)
    return `${url}:${optionsStr}`
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  get<T>(url: string, options?: Record<string, any>): T | null {
    const key = this.generateKey(url, options)
    const entry = this.cache.get(key)

    if (!entry) return null

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  set<T>(url: string, data: T, ttl?: number, options?: Record<string, any>): void {
    const key = this.generateKey(url, options)

    // FIFO eviction
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    })
  }

  has(url: string, options?: Record<string, any>): boolean {
    return this.get(url, options) !== null
  }

  remove(url: string, options?: Record<string, any>): void {
    const key = this.generateKey(url, options)
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removed++
      }
    }
  }

  get size(): number {
    return this.cache.size
  }

  // Fetch with automatic caching
  async fetchWithCache<T>(
    url: string,
    options?: {
      fetchOptions?: RequestInit
      ttl?: number
      force?: boolean
    }
  ): Promise<T> {
    const { fetchOptions = {}, ttl, force = false } = options || {}

    // Return cached data if available and not forced
    if (!force) {
      const cached = this.get<T>(url)
      if (cached) return cached
    }

    try {
      const response = await fetch(url, fetchOptions)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Cache successful response
      this.set(url, data, ttl)

      return data
    } catch (error) {
      // Return stale cache on error if available
      const cached = this.get<T>(url)
      if (cached) {
        console.warn(`Fetch failed for ${url}, returning stale cache:`, error)
        return cached
      }

      throw error
    }
  }
}

// Singleton instance
export const apiCache = new APICache()
