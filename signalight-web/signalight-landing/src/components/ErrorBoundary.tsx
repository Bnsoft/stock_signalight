"use client"

import React, { ReactNode, ReactElement } from "react"
import { AlertCircle } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactElement
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-background p-6 flex items-center justify-center">
            <div className="max-w-md w-full">
              <div className="bg-red-600/10 border border-red-600 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-red-600 mb-2">문제가 발생했습니다</h1>
                <p className="text-muted-foreground mb-4 text-sm">
                  {this.state.error?.message || "예상치 못한 오류가 발생했습니다"}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
                >
                  페이지 새로고침
                </button>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
