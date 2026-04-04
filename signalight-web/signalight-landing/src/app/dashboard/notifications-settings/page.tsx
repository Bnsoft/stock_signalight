"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AnimateIn } from "@/components/layout/AnimateIn"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface NotificationSettings {
  email_enabled: boolean
  email: string
  discord_enabled: boolean
  discord_webhook: string
  slack_enabled: boolean
  slack_webhook: string
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_enabled: false,
    email: "",
    discord_enabled: false,
    discord_webhook: "",
    slack_enabled: false,
    slack_webhook: "",
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/notification-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "default", prefs: settings }),
      })
      if (res.ok) {
        setMessage("✅ Settings saved!")
        setTimeout(() => setMessage(""), 3000)
      }
    } catch (err) {
      setMessage("❌ Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (channel: string) => {
    try {
      await fetch(`${API_BASE}/api/test-notification?channel=${channel}`, {
        method: "POST",
      })
      setMessage(`📨 Test sent to ${channel}`)
      setTimeout(() => setMessage(""), 3000)
    } catch (err) {
      setMessage(`❌ Test failed for ${channel}`)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <AnimateIn from="bottom">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
            <p className="text-muted-foreground">Configure multi-channel alerts</p>
          </div>
        </AnimateIn>

        {message && (
          <AnimateIn from="bottom">
            <div className="bg-muted/50 border border-signal-green/30 rounded-lg p-4 mb-6">
              {message}
            </div>
          </AnimateIn>
        )}

        <div className="space-y-6">
          {/* Email */}
          <AnimateIn from="bottom" delay={80}>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Email Alerts</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.email_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, email_enabled: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Enabled</span>
                </label>
              </div>

              {settings.email_enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-2">Email Address</label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTest("email")}
                  >
                    Send Test Email
                  </Button>
                </div>
              )}
            </div>
          </AnimateIn>

          {/* Discord */}
          <AnimateIn from="bottom" delay={160}>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Discord Webhook</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.discord_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, discord_enabled: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Enabled</span>
                </label>
              </div>

              {settings.discord_enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-2">Webhook URL</label>
                    <input
                      type="url"
                      value={settings.discord_webhook}
                      onChange={(e) =>
                        setSettings({ ...settings, discord_webhook: e.target.value })
                      }
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 font-mono text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTest("discord")}
                  >
                    Send Test Discord
                  </Button>
                </div>
              )}
            </div>
          </AnimateIn>

          {/* Slack */}
          <AnimateIn from="bottom" delay={240}>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Slack Webhook</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.slack_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, slack_enabled: e.target.checked })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Enabled</span>
                </label>
              </div>

              {settings.slack_enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-2">Webhook URL</label>
                    <input
                      type="url"
                      value={settings.slack_webhook}
                      onChange={(e) =>
                        setSettings({ ...settings, slack_webhook: e.target.value })
                      }
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 font-mono text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTest("slack")}
                  >
                    Send Test Slack
                  </Button>
                </div>
              )}
            </div>
          </AnimateIn>

          {/* Save Button */}
          <AnimateIn from="bottom" delay={320}>
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-signal-green text-black hover:bg-signal-green/90"
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </AnimateIn>
        </div>
      </div>
    </div>
  )
}
