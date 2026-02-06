"use client"

import { useState, useEffect } from "react"
import { Star, Archive, Trash2, Mail, MailOpen, RefreshCw, Loader2 } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

interface Email {
  id: string
  from: string
  fromEmail: string
  subject: string
  snippet?: string
  summary?: string
  isRead: boolean
  isStarred: boolean
  isArchived: boolean
  isDeleted: boolean
  category?: {
    name: string
    color?: string
  }
  receivedAt: string
}

export function EmailList({ folder, category }: { folder?: string; category?: string }) {
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [currentTab, setCurrentTab] = useState<"all" | "unread">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchEmails()
  }, [currentTab, folder, category])

  const fetchEmails = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (currentTab === "unread") params.append("unread", "true")
      if (folder) params.append("folder", folder)
      if (category) params.append("category", category)

      const response = await fetch(`/api/emails?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setEmails(data.emails || [])
      }
    } catch (error) {
      console.error("Error fetching emails:", error)
      toast({
        title: "Error",
        description: "Failed to load emails",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const syncEmails = async () => {
    setIsSyncing(true)
    try {
      // Get first connection
      const connectionsResponse = await fetch("/api/connections")
      if (connectionsResponse.ok) {
        const data = await connectionsResponse.json()
        if (data.connections && data.connections.length > 0) {
          const connectionId = data.connections[0].id
          
          const syncResponse = await fetch(`/api/connections/${connectionId}/sync`, {
            method: "POST",
          })

          if (syncResponse.ok) {
            const syncData = await syncResponse.json()
            toast({
              title: "Sync Complete",
              description: `Synced ${syncData.synced} new emails`,
            })
            fetchEmails()
          }
        } else {
          toast({
            title: "No Connections",
            description: "Please connect an email account first",
          })
        }
      }
    } catch (error) {
      console.error("Error syncing emails:", error)
      toast({
        title: "Sync Error",
        description: "Failed to sync emails",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedEmails((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  const toggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const email = emails.find((em) => em.id === id)
      if (!email) return

      const response = await fetch(`/api/emails/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isStarred: !email.isStarred,
        }),
      })

      if (response.ok) {
        setEmails((prev) =>
          prev.map((em) =>
            em.id === id ? { ...em, isStarred: !em.isStarred } : em
          )
        )
      }
    } catch (error) {
      console.error("Error updating star:", error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/emails/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })

      if (response.ok) {
        setEmails((prev) =>
          prev.map((em) => (em.id === id ? { ...em, isRead: true } : em))
        )
      }
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant={currentTab === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCurrentTab("all")}
          >
            All
          </Button>
          <Button
            variant={currentTab === "unread" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCurrentTab("unread")}
          >
            Unread
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={syncEmails}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto email-list">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Mail className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No emails yet</p>
            <p className="text-sm">Connect an email account to get started</p>
            <Link href="/connect">
              <Button className="mt-4" variant="outline">
                Connect Email
              </Button>
            </Link>
          </div>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
                !email.isRead && "bg-primary/5"
              )}
              onClick={() => markAsRead(email.id)}
            >
              <Checkbox
                checked={selectedEmails.includes(email.id)}
                onCheckedChange={() => toggleSelect(email.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-5 w-5",
                  email.isStarred ? "text-yellow-500" : "text-muted-foreground/50"
                )}
                onClick={(e) => toggleStar(email.id, e)}
              >
                <Star
                  className="h-4 w-4"
                  fill={email.isStarred ? "currentColor" : "none"}
                />
              </Button>
              <Link
                href={`/email/${email.id}`}
                className="flex-1 min-w-0 flex items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={cn(
                    "flex-1 min-w-0",
                    !email.isRead && "font-medium"
                  )}
                >
                  <span className="truncate">{email.from}</span>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={cn("truncate", !email.isRead && "font-medium")}>
                    {email.subject}
                  </span>
                  <span className="text-muted-foreground text-sm truncate">
                    - {email.snippet}
                  </span>
                </div>
                {email.category && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: email.category.color || "#888" }}
                  />
                )}
              </Link>
              <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                {formatDate(email.receivedAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
