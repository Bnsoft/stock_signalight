"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"

export default function LoginPage() {
  const { login, loginGuest } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setError("")
    setLoading(true)

    try {
      await loginGuest()
    } catch (err: any) {
      setError(err.message || "Guest mode failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <AnimateIn from="bottom">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Sign In</h1>
              <p className="text-muted-foreground">Access your investment signals</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">Or continue as</span>
              </div>
            </div>

            {/* Guest Mode */}
            <Button
              onClick={handleGuestLogin}
              variant="outline"
              className="w-full mb-4"
              disabled={loading}
            >
              {loading ? "Loading..." : "Guest Mode (Full Access)"}
            </Button>

            {/* Signup Link */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/auth/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </div>

            {/* Info */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                Guest mode gives you full access to all features for testing. Create an account to save your data.
              </p>
            </div>
          </div>
        </div>
      </AnimateIn>
    </div>
  )
}
