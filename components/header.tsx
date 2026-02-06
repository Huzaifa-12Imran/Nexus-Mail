"use client"

import { useState } from "react"
import { Search, Bell, User, Sparkles, LogOut, Settings, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function Header() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="h-14 border-b border-border px-4 flex items-center justify-between bg-background relative">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5" />
          </Button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-lg shadow-lg p-4 z-50">
              <h3 className="font-semibold mb-3">Notifications</h3>
              <div className="text-sm text-muted-foreground">
                <p>No new notifications</p>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <User className="h-5 w-5" />
            <ChevronDown className="h-3 w-3 ml-1" />
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
