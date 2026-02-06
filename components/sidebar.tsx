"use client"

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
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Inbox", href: "/", icon: Inbox },
  { name: "Starred", href: "/starred", icon: Star },
  { name: "Sent", href: "/sent", icon: Send },
  { name: "Drafts", href: "/drafts", icon: File },
  { name: "Spam", href: "/spam", icon: AlertCircle },
  { name: "Trash", href: "/trash", icon: Trash2 },
]

export function Sidebar() {
  const pathname = usePathname()

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
