import { useEffect, useState, useCallback, useRef } from "react"

export interface RealtimeMessage {
  type: "price_update" | "chart_update" | "indicator_update" | "initial_data" | "pong" | "alert_triggered"
  symbol?: string
  data?: any
  timestamp?: string
  alert_id?: number
}

interface RealtimeOptions {
  url?: string
  autoConnect?: boolean
  reconnect?: boolean
  reconnectInterval?: number
}

export function useRealtimeData(
  symbol: string | string[],
  options: RealtimeOptions = {}
) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000",
    autoConnect = true,
    reconnect = true,
    reconnectInterval = 3000,
  } = options

  const [data, setData] = useState<RealtimeMessage | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const symbolsRef = useRef<Set<string>>(new Set())

  const normalizeSymbols = (syms: string | string[]): string[] => {
    return Array.isArray(syms) ? syms : [syms]
  }

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const symbols = normalizeSymbols(symbol)
    const primarySymbol = symbols[0]

    try {
      const wsUrl = `${url}/ws/realtime/${primarySymbol}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setConnected(true)
        setError(null)
        symbolsRef.current = new Set(symbols)

        // Subscribe to additional symbols
        symbols.slice(1).forEach((sym) => {
          ws.send(JSON.stringify({ type: "subscribe", symbol: sym }))
        })
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as RealtimeMessage
          setData(message)
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err)
        }
      }

      ws.onerror = (event) => {
        setError("WebSocket connection error")
        console.error("WebSocket error:", event)
      }

      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null

        if (reconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      wsRef.current = ws
    } catch (err) {
      setError(`Failed to connect: ${err}`)
      console.error("WebSocket connection failed:", err)

      if (reconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, reconnectInterval)
      }
    }
  }, [symbol, url, reconnect, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setConnected(false)
  }, [])

  const subscribe = useCallback((newSymbol: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", symbol: newSymbol }))
      symbolsRef.current.add(newSymbol)
    }
  }, [])

  const unsubscribe = useCallback((unsubSymbol: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "unsubscribe", symbol: unsubSymbol }))
      symbolsRef.current.delete(unsubSymbol)
    }
  }, [])

  const ping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }))
    }
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [])

  return {
    data,
    connected,
    error,
    subscribe,
    unsubscribe,
    ping,
    disconnect,
    connect,
  }
}

export function usePriceUpdate(symbol: string) {
  const { data, connected } = useRealtimeData(symbol)

  const priceData = data?.type === "price_update" ? data.data : null

  return {
    price: priceData?.price,
    bid: priceData?.bid,
    ask: priceData?.ask,
    volume: priceData?.volume,
    changePercent: priceData?.change_percent,
    timestamp: priceData?.timestamp,
    connected,
  }
}

export function useChartData(symbol: string) {
  const { data, connected } = useRealtimeData(symbol)

  const chartData = data?.type === "chart_update" ? data.data : null

  return {
    open: chartData?.open,
    high: chartData?.high,
    low: chartData?.low,
    close: chartData?.close,
    volume: chartData?.volume,
    timeframe: chartData?.timeframe,
    timestamp: chartData?.timestamp,
    connected,
  }
}

export function useIndicators(symbol: string) {
  const { data, connected } = useRealtimeData(symbol)

  const indicatorData = data?.type === "indicator_update" ? data.data : null

  return {
    rsi: indicatorData?.rsi,
    sma20: indicatorData?.sma_20,
    sma50: indicatorData?.sma_50,
    sma200: indicatorData?.sma_200,
    macd: indicatorData?.macd,
    macdSignal: indicatorData?.macd_signal,
    bollingerUpper: indicatorData?.bollinger_upper,
    bollingerMiddle: indicatorData?.bollinger_middle,
    bollingerLower: indicatorData?.bollinger_lower,
    atr: indicatorData?.atr,
    stochK: indicatorData?.stoch_k,
    stochD: indicatorData?.stoch_d,
    timestamp: indicatorData?.timestamp,
    connected,
  }
}
