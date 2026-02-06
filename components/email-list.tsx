"use client"

import { useState, useEffect } from "react"
import { Star, Archive, Trash2, Mail, MailOpen, RefreshCw, Loader2, Filter, X, Menu, Bell, Clock } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { SnoozeModal } from "@/components/snooze-modal"
import { ReminderModal } from "@/components/reminder-modal"

interface Email {
  id: string
  from: string
  fromEmail: string
  subject: string
  snippet?: string
  summary?: string
  body?: string
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
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([])
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [currentTab, setCurrentTab] = useState<"all" | "unread">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [filterSender, setFilterSender] = useState("")
  const [filterSubject, setFilterSubject] = useState("")
  const [filterDateRange, setFilterDateRange] = useState<"all" | "today" | "week" | "month">("all")
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [hoveredEmail, setHoveredEmail] = useState<string | null>(null)
  const [showSnoozeModal, setShowSnoozeModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [selectedEmailForAction, setSelectedEmailForAction] = useState<Email | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchEmails()
  }, [currentTab, folder, category])

  // Listen for account switching from header
  useEffect(() => {
    const handleStorageChange = () => {
      fetchEmails()
    }
    
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  useEffect(() => {
    applyFilters()
  }, [emails, filterSender, filterSubject, filterDateRange])

  const fetchEmails = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (currentTab === "unread") params.append("unread", "true")
      if (folder) params.append("folder", folder)
      if (category) params.append("category", category)

      // Get selected connection from localStorage
      const selectedConnectionId = localStorage.getItem("selectedConnectionId")
      if (selectedConnectionId) {
        params.append("connectionId", selectedConnectionId)
      }

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

  const applyFilters = () => {
    let result = [...emails]

    // Filter by sender
    if (filterSender.trim()) {
      const senderLower = filterSender.toLowerCase()
      result = result.filter(
        (e) =>
          e.from.toLowerCase().includes(senderLower) ||
          e.fromEmail.toLowerCase().includes(senderLower)
      )
    }

    // Filter by subject
    if (filterSubject.trim()) {
      const subjectLower = filterSubject.toLowerCase()
      result = result.filter((e) => e.subject.toLowerCase().includes(subjectLower))
    }

    // Filter by date
    if (filterDateRange !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      result = result.filter((e) => {
        const emailDate = new Date(e.receivedAt)
        switch (filterDateRange) {
          case "today":
            return emailDate >= today
          case "week":
            return emailDate >= weekAgo
          case "month":
            return emailDate >= monthAgo
          default:
            return true
        }
      })
    }

    setFilteredEmails(result)
  }

  const clearFilters = () => {
    setFilterSender("")
    setFilterSubject("")
    setFilterDateRange("all")
    setShowFilters(false)
  }

  const syncEmails = async () => {
    setIsSyncing(true)
    try {
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
    const newSelected = selectedEmails.includes(id)
      ? selectedEmails.filter((e) => e !== id)
      : [...selectedEmails, id]
    setSelectedEmails(newSelected)
    setShowBulkActions(newSelected.length > 0)
  }

  const selectAll = () => {
    if (selectedEmails.length === filteredEmails.length) {
      setSelectedEmails([])
      setShowBulkActions(false)
    } else {
      setSelectedEmails(filteredEmails.map((e) => e.id))
      setShowBulkActions(true)
    }
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
          prev.map((em) => (em.id === id ? { ...em, isStarred: !em.isStarred } : em))
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

  const bulkMarkAsRead = async () => {
    try {
      await Promise.all(
        selectedEmails.map((id) =>
          fetch(`/api/emails/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: true }),
          })
        )
      )
      setEmails((prev) =>
        prev.map((em) =>
          selectedEmails.includes(em.id) ? { ...em, isRead: true } : em
        )
      )
      setSelectedEmails([])
      setShowBulkActions(false)
      toast({ title: "Success", description: "Emails marked as read" })
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }

  const bulkArchive = async () => {
    try {
      await Promise.all(
        selectedEmails.map((id) =>
          fetch(`/api/emails/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isArchived: true }),
          })
        )
      )
      setEmails((prev) => prev.filter((em) => !selectedEmails.includes(em.id)))
      setSelectedEmails([])
      setShowBulkActions(false)
      toast({ title: "Success", description: "Emails archived" })
    } catch (error) {
      console.error("Error archiving:", error)
    }
  }

  const bulkDelete = async () => {
    try {
      await Promise.all(
        selectedEmails.map((id) =>
          fetch(`/api/emails/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDeleted: true }),
          })
        )
      )
      setEmails((prev) => prev.filter((em) => !selectedEmails.includes(em.id)))
      setSelectedEmails([])
      setShowBulkActions(false)
      toast({ title: "Success", description: "Emails deleted" })
    } catch (error) {
      console.error("Error deleting:", error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/emails/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      })
      setEmails((prev) => prev.filter((em) => em.id !== id))
      toast({ title: "Success", description: "Email deleted" })
    } catch (error) {
      console.error("Error deleting email:", error)
    }
  }

  const handleSnooze = async (snoozeUntil: string) => {
    if (!selectedEmailForAction) return
    try {
      await fetch(`/api/emails/${selectedEmailForAction.id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snoozeUntil }),
      })
      setEmails((prev) => prev.filter((em) => em.id !== selectedEmailForAction.id))
      setShowSnoozeModal(false)
      setSelectedEmailForAction(null)
      toast({ title: "Email snoozed", description: "The email will return at the specified time" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to snooze email", variant: "destructive" })
    }
  }

  const handleSetReminder = async (reminder: { title: string; message?: string; remindAt: string }) => {
    if (!selectedEmailForAction) return
    try {
      await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: selectedEmailForAction.id,
          title: reminder.title,
          message: reminder.message,
          remindAt: reminder.remindAt,
        }),
      })
      setShowReminderModal(false)
      setSelectedEmailForAction(null)
      toast({ title: "Reminder set", description: "You will be reminded about this email" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to set reminder", variant: "destructive" })
    }
  }

  const openSnoozeModal = (email: Email) => {
    setSelectedEmailForAction(email)
    setShowSnoozeModal(true)
  }

  const openReminderModal = (email: Email) => {
    setSelectedEmailForAction(email)
    setShowReminderModal(true)
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header controls */}
      <div className="flex items-center justify-between px-2 md:px-4 py-2 border-b border-border gap-2">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          {/* Mobile menu button */}
          <Button
            variant="outline"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => {
              localStorage.setItem("sidebarOpen", "true")
              window.dispatchEvent(new Event("storage"))
            }}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 md:gap-2 overflow-x-auto">
            <Button
            variant={currentTab === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCurrentTab("all")}
            className="text-xs md:text-sm"
          >
            All
          </Button>
          <Button
            variant={currentTab === "unread" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCurrentTab("unread")}
            className="text-xs md:text-sm"
          >
            Unread
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters ? "bg-muted" : "", "text-xs md:text-sm")}
          >
            <Filter className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>
      </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
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

      {/* Bulk actions toolbar - appears before filters for better visibility */}
      {showBulkActions && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-2 md:px-4 py-2 bg-primary text-primary-foreground border-b border-primary shadow-sm">
          <span className="text-sm font-medium">
            {selectedEmails.length} selected
          </span>
          <div className="flex flex-wrap gap-1 md:gap-2">
            <Button variant="secondary" size="sm" onClick={bulkMarkAsRead}>
              <MailOpen className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
              <span className="hidden sm:inline">Mark read</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={bulkArchive}>
              <Archive className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
              <span className="hidden sm:inline">Archive</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSelectedEmails([])
              setShowBulkActions(false)
            }}
            className="ml-auto hover:bg-primary-foreground/20 text-xs md:text-sm"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="px-2 md:px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex flex-wrap gap-2 md:gap-3 items-end">
            <div className="w-full sm:w-36 md:w-48">
              <label className="text-xs text-muted-foreground hidden sm:block">From (sender)</label>
              <Input
                placeholder="Sender..."
                value={filterSender}
                onChange={(e) => setFilterSender(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="w-full sm:w-36 md:w-48">
              <label className="text-xs text-muted-foreground hidden sm:block">Subject</label>
              <Input
                placeholder="Subject..."
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="w-28 md:w-36">
              <label className="text-xs text-muted-foreground hidden md:block">Date</label>
              <select
                value={filterDateRange}
                onChange={(e) =>
                  setFilterDateRange(e.target.value as "all" | "today" | "week" | "month")
                }
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Email list */}
      <div className="flex-1 overflow-y-auto email-list">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Mail className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No emails found</p>
            <p className="text-sm">
              {emails.length === 0
                ? "Connect an email account to get started"
                : "Try adjusting your filters"}
            </p>
            {emails.length === 0 && (
              <Link href="/connect">
                <Button className="mt-4" variant="outline">
                  Connect Email
                </Button>
              </Link>
            )}
          </div>
        ) : (
          filteredEmails.map((email) => (
            <div
              key={email.id}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors group",
                !email.isRead && "bg-primary/5",
                selectedEmails.includes(email.id) && "bg-primary/10 border-l-2 border-l-primary"
              )}
              onClick={() => markAsRead(email.id)}
              onMouseEnter={() => setHoveredEmail(email.id)}
              onMouseLeave={() => setHoveredEmail(null)}
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
                  "h-4 w-4 shrink-0",
                  email.isStarred ? "text-yellow-500" : "text-muted-foreground/50"
                )}
                onClick={(e) => toggleStar(email.id, e)}
              >
                <Star
                  className="h-3.5 w-3.5"
                  fill={email.isStarred ? "currentColor" : "none"}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 shrink-0 text-muted-foreground/50 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(email.id)
                }}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              {/* Snooze button - always visible on hover */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground/50 hover:text-blue-600 transition-opacity",
                  hoveredEmail === email.id ? "opacity-100" : "opacity-0"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  openSnoozeModal(email)
                }}
                title="Snooze"
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
              {/* Reminder button - always visible on hover */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground/50 hover:text-green-600 transition-opacity",
                  hoveredEmail === email.id ? "opacity-100" : "opacity-0"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  openReminderModal(email)
                }}
                title="Set reminder"
              >
                <Bell className="h-3.5 w-3.5" />
              </Button>
              <Link
                href={`/email/${email.id}`}
                className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={cn(
                    "min-w-0 flex-shrink-0",
                    !email.isRead && "font-semibold"
                  )}
                >
                  <span className="truncate text-xs md:text-sm block">{email.from}</span>
                  <span className={cn("truncate text-xs", !email.isRead && "font-medium")}>
                    {email.subject}
                  </span>
                </div>
              </Link>
              <div 
                className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 cursor-help relative ml-2"
                onMouseEnter={() => setHoveredDate(email.id)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                {hoveredDate === email.id 
                  ? new Date(email.receivedAt).toLocaleString()
                  : formatDate(email.receivedAt)
                }
              </div>
            </div>
          ))
        )}
      </div>

      {/* Snooze Modal */}
      {selectedEmailForAction && (
        <SnoozeModal
          isOpen={showSnoozeModal}
          onClose={() => {
            setShowSnoozeModal(false)
            setSelectedEmailForAction(null)
          }}
          emailId={selectedEmailForAction.id}
          onSnooze={handleSnooze}
        />
      )}

      {/* Reminder Modal */}
      {selectedEmailForAction && (
        <ReminderModal
          isOpen={showReminderModal}
          onClose={() => {
            setShowReminderModal(false)
            setSelectedEmailForAction(null)
          }}
          emailId={selectedEmailForAction.id}
          emailSubject={selectedEmailForAction.subject}
          onCreateReminder={handleSetReminder}
        />
      )}
    </div>
  )
}
