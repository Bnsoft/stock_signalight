"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { LogOut, Settings, Download } from "lucide-react"

interface UserProfile {
  user: {
    id: string
    email?: string
    display_name: string
    auth_method: string
    created_at: string
  }
  preferences: {
    theme: string
    notification_email: boolean
    subscription_plan: string
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function ProfilePage() {
  const { user, token, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/user/${user.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          throw new Error("Failed to load profile")
        }

        const data = await res.json()
        setProfile(data)
      } catch (err: any) {
        setError(err.message || "Error loading profile")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, token])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-red-500">{error || "Failed to load profile"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Profile</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
        </AnimateIn>

        {/* User Info Card */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{profile.user.display_name}</h2>
                {profile.user.email && (
                  <p className="text-muted-foreground">{profile.user.email}</p>
                )}
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                {profile.user.auth_method === "password" ? "Email" : profile.user.auth_method}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 pt-6 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Member Since</p>
                <p className="font-mono text-sm">
                  {new Date(profile.user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">User ID</p>
                <p className="font-mono text-sm">{profile.user.id.slice(0, 8)}...</p>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Subscription Tier Card */}
        <AnimateIn from="bottom" delay={160}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Subscription Plan</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg border border-border/50 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Current Plan</p>
                <p className="text-xl font-bold capitalize">
                  {profile.preferences.subscription_plan}
                </p>
              </div>

              <div className="text-center p-4 rounded-lg border border-border/50 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Features</p>
                <p className="text-sm">
                  {profile.preferences.subscription_plan === "guest"
                    ? "Full Access"
                    : "All Features"}
                </p>
              </div>

              <div className="text-center p-4 rounded-lg border border-border/50 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2">Cost</p>
                <p className="text-xl font-bold">
                  {profile.preferences.subscription_plan === "guest" ? "Free" : "$9.99/mo"}
                </p>
              </div>
            </div>

            {profile.preferences.subscription_plan === "guest" && (
              <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm">
                  You're using Guest Mode. Create an account to save your data permanently.
                </p>
              </div>
            )}
          </div>
        </AnimateIn>

        {/* Settings Links */}
        <AnimateIn from="bottom" delay={240}>
          <div className="space-y-4 mb-6">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => (window.location.href = "/dashboard/settings")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Preferences & Settings
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => (window.location.href = "/dashboard/calculations")}
            >
              <Download className="w-4 h-4 mr-2" />
              Your Calculations
            </Button>
          </div>
        </AnimateIn>

        {/* Logout Button */}
        <AnimateIn from="bottom" delay={320}>
          <Button
            variant="destructive"
            className="w-full"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </AnimateIn>

        {/* Info Section */}
        <AnimateIn from="bottom" delay={400}>
          <div className="mt-8 pt-6 border-t border-border/50">
            <h4 className="font-semibold mb-2">Account Settings Tips</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Visit Settings to customize your notification preferences</li>
              <li>• Your calculations are automatically saved to your account</li>
              <li>• Guest accounts have full feature access but data is not persisted</li>
              <li>• You can export your calculations as CSV or PDF</li>
            </ul>
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}
