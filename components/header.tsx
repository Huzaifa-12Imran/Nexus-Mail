"use client"

import { useState, useEffect } from "react"
import { Search, Bell, User, Sparkles, LogOut, Settings, ChevronDown, RefreshCw, Clock, Sun, Moon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"

const SYNC_INTERVALS = [
  { label: "1 minute", value: 60000 },
  { label: "5 minutes", value: 300000 },
  { label: "10 minutes", value: 600000 },
]

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAutoSync, setShowAutoSync] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [autoSyncInterval, setAutoSyncInterval] = useState(300000)
  const [nextSyncCountdown, setNextSyncCountdown] = useState<number | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // Load notification settings
  useEffect(() => {
    const saved = localStorage.getItem("notifications")
    if (saved) {
      setNotificationsEnabled(JSON.parse(saved))
    }
  }, [])

  // Request notification permission
  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications")
      return
    }
    
    const permission = await Notification.requestPermission()
    if (permission === "granted") {
      setNotificationsEnabled(true)
      localStorage.setItem("notifications", JSON.stringify(true))
    }
  }

  const disableNotifications = () => {
    setNotificationsEnabled(false)
    localStorage.setItem("notifications", JSON.stringify(false))
  }

  // Load auto-sync settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("autoSync")
    if (saved) {
      const { enabled, interval } = JSON.parse(saved)
      setAutoSyncEnabled(enabled)
      setAutoSyncInterval(interval || 300000)
    }
  }, [])

  // Auto-sync countdown and interval
  useEffect(() => {
    let intervalId: NodeJS.Timeout
    let countdownId: NodeJS.Timeout

    if (autoSyncEnabled) {
      // Save settings
      localStorage.setItem("autoSync", JSON.stringify({ enabled: true, interval: autoSyncInterval }))

      // Set up countdown
      setNextSyncCountdown(autoSyncInterval / 1000)

      // Sync immediately
      handleSync()

      // Set up interval
      intervalId = setInterval(() => {
        handleSync()
        setNextSyncCountdown(autoSyncInterval / 1000)
      }, autoSyncInterval)

      // Update countdown every second
      countdownId = setInterval(() => {
        setNextSyncCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : autoSyncInterval / 1000))
      }, 1000)
    } else {
      localStorage.setItem("autoSync", JSON.stringify({ enabled: false, interval: autoSyncInterval }))
      setNextSyncCountdown(null)
    }

    return () => {
      clearInterval(intervalId)
      clearInterval(countdownId)
    }
  }, [autoSyncEnabled, autoSyncInterval])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const connectionsResponse = await fetch("/api/connections")
      if (connectionsResponse.ok) {
        const data = await connectionsResponse.json()
        if (data.connections && data.connections.length > 0) {
          const connectionId = data.connections[0].id
          await fetch(`/api/connections/${connectionId}/sync`, { method: "POST" })
          window.location.reload()
        }
      }
    } catch (error) {
      console.error("Sync error:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <header className="h-14 md:h-16 border-b border-border px-2 md:px-4 flex items-center justify-between bg-background relative gap-2">
      {/* Search bar - reduced width on mobile */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="relative w-full max-w-xs md:max-w-md flex-1">
          <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 md:pl-10 bg-muted/50 h-9 md:h-10 text-sm"
          />
        </div>
      </div>

      {/* Header buttons - compact on mobile */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:h-9 md:w-9"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          <Sun className="h-4 w-4 md:h-5 md:w-5 dark:hidden" />
          <Moon className="h-4 w-4 md:h-5 md:w-5 hidden dark:block" />
        </Button>

        {/* Auto-sync toggle */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => setShowAutoSync(!showAutoSync)}
            title="Auto-sync settings"
          >
            <Clock className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          {showAutoSync && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-lg shadow-lg p-4 z-50">
              <h3 className="font-semibold mb-3">Auto Sync</h3>
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant={autoSyncEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                  className="flex-1"
                >
                  {autoSyncEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>
              {autoSyncEnabled && nextSyncCountdown !== null && (
                <p className="text-sm text-muted-foreground mb-3">
                  Next sync: {formatCountdown(nextSyncCountdown)}
                </p>
              )}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Sync interval:</p>
                {SYNC_INTERVALS.map((interval) => (
                  <Button
                    key={interval.value}
                    variant={autoSyncInterval === interval.value ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setAutoSyncInterval(interval.value)}
                  >
                    {interval.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Manual sync button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:h-9 md:w-9"
          onClick={handleSync}
          disabled={isSyncing || autoSyncEnabled}
          title="Sync emails"
        >
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 md:h-5 md:w-5" />
          )}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-lg shadow-lg p-4 z-50">
              <h3 className="font-semibold mb-3">Notifications</h3>
              {notificationsEnabled ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm">Desktop notifications enabled</span>
                    <Button variant="ghost" size="sm" onClick={disableNotifications}>
                      Disable
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>You'll be notified when new emails arrive</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground mb-3">
                    <p>Enable desktop notifications to get alerts for new emails</p>
                  </div>
                  <Button onClick={enableNotifications} className="w-full">
                    Enable Notifications
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <User className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-lg shadow-lg py-2 z-50">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-4"
                onClick={() => {
                  router.push("/connect")
                  setShowUserMenu(false)
                }}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 px-4 text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
