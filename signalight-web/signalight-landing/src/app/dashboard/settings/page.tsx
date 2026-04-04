"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"
import { Save, AlertTriangle } from "lucide-react"

interface Preferences {
  theme: string
  notification_email: boolean
  subscription_plan: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function SettingsPage() {
  const { user, token } = useAuth()
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!user?.user_id || !token) return

    const fetchPreferences = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/user/${user.user_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          throw new Error("Failed to load preferences")
        }

        const data = await res.json()
        setPreferences(data.preferences)
      } catch (err: any) {
        setError(err.message || "Error loading preferences")
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [user, token])

  const handleSave = async () => {
    if (!user?.user_id || !token || !preferences) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const res = await fetch(`${API_BASE}/api/user/${user.user_id}/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      })

      if (!res.ok) {
        throw new Error("Failed to save preferences")
      }

      setSuccess("Preferences saved successfully!")
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      setError(err.message || "Error saving preferences")
    } finally {
      setSaving(false)
    }
  }

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

  if (!preferences) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-red-500">{error || "Failed to load settings"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your preferences and account options</p>
          </div>
        </AnimateIn>

        {/* Messages */}
        {error && (
          <AnimateIn from="bottom">
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          </AnimateIn>
        )}

        {success && (
          <AnimateIn from="bottom">
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          </AnimateIn>
        )}

        {/* Theme Settings */}
        <AnimateIn from="bottom" delay={80}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Appearance</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {["system", "light", "dark"].map((theme) => (
                    <button
                      key={theme}
                      onClick={() =>
                        setPreferences({ ...preferences, theme })
                      }
                      className={`p-3 rounded-lg border-2 transition ${
                        preferences.theme === theme
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/50 hover:border-border"
                      }`}
                    >
                      <p className="text-sm font-medium capitalize">{theme}</p>
                      <p className="text-xs text-muted-foreground">
                        {theme === "system"
                          ? "Auto"
                          : theme === "light"
                            ? "☀️"
                            : "🌙"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Notification Settings */}
        <AnimateIn from="bottom" delay={160}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Notifications</h3>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.notification_email}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      notification_email: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm">
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Get alerts about new signals and calculations
                  </p>
                </span>
              </label>
            </div>
          </div>
        </AnimateIn>

        {/* Plan Info */}
        <AnimateIn from="bottom" delay={240}>
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
            <div className="text-center p-6 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-2">Subscription Plan</p>
              <p className="text-2xl font-bold capitalize mb-2">
                {preferences.subscription_plan}
              </p>
              <p className="text-xs text-muted-foreground">
                {preferences.subscription_plan === "guest"
                  ? "You have full access while in test mode"
                  : "Enjoy unlimited access to all features"}
              </p>
            </div>
          </div>
        </AnimateIn>

        {/* Danger Zone */}
        <AnimateIn from="bottom" delay={320}>
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Irreversible actions
                </p>
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure? This will delete your account and all data. This action cannot be undone."
                  )
                ) {
                  console.log("Account deletion requested")
                  // TODO: Implement account deletion API
                }
              }}
            >
              Delete Account
            </Button>
          </div>
        </AnimateIn>

        {/* Save Button */}
        <AnimateIn from="bottom" delay={400}>
          <div className="mt-8 flex gap-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </AnimateIn>
      </div>
    </div>
  )
}
