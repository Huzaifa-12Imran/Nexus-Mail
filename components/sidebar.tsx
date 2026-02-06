"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Inbox,
  Star,
  Send,
  File,
  Trash2,
  AlertCircle,
  Settings,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Inbox", href: "/", icon: Inbox, folder: "inbox" },
  { name: "Starred", href: "/starred", icon: Star, folder: "starred" },
  { name: "Sent", href: "/sent", icon: Send, folder: "sent" },
  { name: "Drafts", href: "/drafts", icon: File, folder: "drafts" },
  { name: "Spam", href: "/spam", icon: AlertCircle, folder: "spam" },
  { name: "Trash", href: "/trash", icon: Trash2, folder: "trash" },
  { name: "Connections", href: "/connections", icon: Mail, folder: "" },
]

interface UnreadCounts {
  inbox: number
  [key: string]: number
}

export function Sidebar({ isOpen = true, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ inbox: 0 })
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    fetchUnreadCounts()
  }, [])

  // Listen for mobile menu toggle from other components
  useEffect(() => {
    const handleStorage = () => {
      const sidebarOpen = localStorage.getItem("sidebarOpen")
      if (sidebarOpen === "true") {
        setIsMobileOpen(true)
        localStorage.setItem("sidebarOpen", "false")
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  useEffect(() => {
    setIsMobileOpen(isOpen)
  }, [isOpen])

  const fetchUnreadCounts = async () => {
    try {
      const response = await fetch("/api/emails?unread=true")
      if (response.ok) {
        const data = await response.json()
        setUnreadCounts({ inbox: data.emails?.length || 0 })
      }
    } catch (error) {
      console.error("Error fetching unread counts:", error)
    }
  }

  const handleLinkClick = () => {
    if (onClose) {
      onClose()
    } else {
      setIsMobileOpen(false)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={handleLinkClick}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-muted border-r border-border flex flex-col h-full fixed md:relative z-40 transition-transform duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "w-64"
        )}
      >
        <div className="p-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📧</span>
            <span>Nexus Mail</span>
          </h1>
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const unreadCount = unreadCounts[item.folder] || 0
            const showBadge = unreadCount > 0 && item.name === "Inbox"

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
                {showBadge && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="space-y-2">
            <div className="text-xs font-medium px-3 text-foreground">
              CATEGORIES
            </div>
            <Link
              href="/category/primary"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Primary</span>
            </Link>
            <Link
              href="/category/social"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
            >
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Social</span>
            </Link>
            <Link
              href="/category/promotions"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted"
            >
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Promotions</span>
            </Link>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <Link href="/connect" onClick={handleLinkClick}>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
          </Link>
        </div>
      </aside>
    </>
  )
}
