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
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Inbox", href: "/", icon: Inbox, folder: "inbox" },
  { name: "Starred", href: "/starred", icon: Star, folder: "starred" },
  { name: "Sent", href: "/sent", icon: Send, folder: "sent" },
  { name: "Drafts", href: "/drafts", icon: File, folder: "drafts" },
  { name: "Spam", href: "/spam", icon: AlertCircle, folder: "spam" },
  { name: "Trash", href: "/trash", icon: Trash2, folder: "trash" },
]

interface UnreadCounts {
  inbox: number
  [key: string]: number
}

export function Sidebar() {
  const pathname = usePathname()
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ inbox: 0 })

  useEffect(() => {
    fetchUnreadCounts()
  }, [])

  const fetchUnreadCounts = async () => {
    try {
      const response = await fetch("/api/emails?unread=true")
      if (response.ok) {
        const data = await response.json()
        // Get unread count for inbox
        setUnreadCounts({ inbox: data.emails?.length || 0 })
      }
    } catch (error) {
      console.error("Error fetching unread counts:", error)
    }
  }

  return (
    <aside className="w-64 bg-muted/30 border-r border-border flex flex-col h-full">
      <div className="p-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">📧</span>
          Nexus Mail
        </h1>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const unreadCount = unreadCounts[item.folder] || 0
          const showBadge = unreadCount > 0 && item.name === "Inbox"

          return (
            <Link
              key={item.name}
              href={item.href}
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
          <div className="text-xs font-medium text-muted-foreground px-3">
            CATEGORIES
          </div>
          <Link
            href="/category/primary"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Primary
          </Link>
          <Link
            href="/category/social"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Social
          </Link>
          <Link
            href="/category/promotions"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            Promotions
          </Link>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Link href="/connect">
          <Button variant="outline" className="w-full justify-start gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>
    </aside>
  )
}
