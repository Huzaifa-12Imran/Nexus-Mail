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
  Clock,
  Bell,
  User,
  RefreshCw,
  Calendar,
  CheckSquare,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Inbox", href: "/", icon: Inbox, folder: "inbox" },
  { name: "Starred", href: "/starred", icon: Star, folder: "starred" },
  { name: "Sent", href: "/sent", icon: Send, folder: "sent" },
  { name: "Drafts", href: "/drafts", icon: File, folder: "drafts" },
  { name: "Spam", href: "/spam", icon: AlertCircle, folder: "spam" },
  { name: "Trash", href: "/trash", icon: Trash2, folder: "trash" },
  { name: "Snoozed", href: "/snoozed", icon: Clock, folder: "snoozed" },
  { name: "Reminders", href: "/reminders", icon: Bell, folder: "" },
  { name: "Tasks", href: "/tasks", icon: CheckSquare, folder: "" },
  { name: "Calendar", href: "/calendar", icon: Calendar, folder: "" },
  { name: "Notes", href: "/notes", icon: FileText, folder: "" },
  { name: "Priority Senders", href: "/priority-senders", icon: User, folder: "" },
  { name: "Connections", href: "/connections", icon: Mail, folder: "" },
]

const motivationalQuotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
  { text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.", author: "Albert Einstein" },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "In three words I can sum up everything I've learned about life: it goes on.", author: "Robert Frost" },
  { text: "If you tell the truth, you don't have to remember anything.", author: "Mark Twain" },
  { text: "A room without books is like a body without a soul.", author: "Marcus Tullius Cicero" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
]

interface UnreadCounts {
  inbox: number
  [key: string]: number
}

export function Sidebar({ isOpen = true, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ inbox: 0 })
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchUnreadCounts()
    fetchQuote()
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

  const fetchQuote = () => {
    // Get today's date and use it to pick a consistent quote for the day
    const today = new Date()
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
    const quoteIndex = dayOfYear % motivationalQuotes.length
    setQuote(motivationalQuotes[quoteIndex])
  }

  const refreshQuote = () => {
    setIsRefreshing(true)
    // Get a random quote
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length)
    setQuote(motivationalQuotes[randomIndex])
    setTimeout(() => setIsRefreshing(false), 500)
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

        {/* Daily Motivational Quote */}
        <div className="p-4 border-t border-border">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">DAILY QUOTE</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={refreshQuote}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              </Button>
            </div>
            {quote && (
              <>
                <p className="text-sm italic text-foreground mb-1">"{quote.text}"</p>
                <p className="text-xs text-muted-foreground text-right">— {quote.author}</p>
              </>
            )}
          </div>
        </div>

        {/* Settings Link */}
        <div className="p-4 border-t border-border">
          <Link href="/settings" onClick={handleLinkClick}>
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
