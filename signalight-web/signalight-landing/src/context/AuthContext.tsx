"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"

interface User {
  user_id: string
  email?: string
  display_name: string
  auth_method: "password" | "google" | "guest"
  preferences?: {
    theme: string
    notification_email: boolean
    subscription_plan: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  token: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  loginGuest: () => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Initialize auth from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token")
    const storedUser = localStorage.getItem("auth_user")

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }

    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || "Login failed")
      }

      const data = await res.json()
      setToken(data.token)
      const userData: User = {
        user_id: data.user_id,
        email: data.email,
        display_name: data.display_name,
        auth_method: data.auth_method,
      }
      setUser(userData)

      localStorage.setItem("auth_token", data.token)
      localStorage.setItem("auth_user", JSON.stringify(userData))

      router.push("/dashboard")
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const signup = async (email: string, password: string, displayName: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, display_name: displayName }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || "Signup failed")
      }

      const data = await res.json()
      setToken(data.token)
      const userData: User = {
        user_id: data.user_id,
        email: data.email,
        display_name: data.display_name,
        auth_method: data.auth_method,
      }
      setUser(userData)

      localStorage.setItem("auth_token", data.token)
      localStorage.setItem("auth_user", JSON.stringify(userData))

      router.push("/dashboard")
    } catch (error) {
      console.error("Signup error:", error)
      throw error
    }
  }

  const loginGuest = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || "Guest mode failed")
      }

      const data = await res.json()
      setToken(data.token)
      const userData: User = {
        user_id: data.user_id,
        display_name: data.display_name,
        auth_method: "guest",
      }
      setUser(userData)

      localStorage.setItem("auth_token", data.token)
      localStorage.setItem("auth_user", JSON.stringify(userData))

      router.push("/dashboard")
    } catch (error) {
      console.error("Guest login error:", error)
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    router.push("/auth/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        login,
        signup,
        loginGuest,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
