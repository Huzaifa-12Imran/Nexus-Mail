"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Star, Reply, Forward, Sparkles, Loader2, Calendar, CheckSquare, FileText, Plus, Paperclip, Download, Zap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { ComposeModal } from "@/components/compose-modal"
import { EnergyRatingButtons } from "@/components/EnergyRatingModal"

interface ExtractedEvent {
  title: string
  description?: string
  date?: string
  time?: string
  location?: string
  attendees?: string[]
  isAllDay?: boolean
}

interface ExtractedTask {
  taskName: string
  deadline?: string
  priority?: "low" | "medium" | "high" | "urgent"
}

interface ExtractedData {
  events: ExtractedEvent[]
  tasks: ExtractedTask[]
  summary: string
}

export default function EmailDetailPage() {
  const params = useParams()
  const [email, setEmail] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarred, setIsStarred] = useState(false)
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [replyType, setReplyType] = useState<"reply" | "forward">("reply")
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [showExtractedMenu, setShowExtractedMenu] = useState(false)
  const [showEnergyRating, setShowEnergyRating] = useState(false)
  const { toast } = useToast()

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  useEffect(() => {
    if (params.id) {
      fetchEmail()
    }
  }, [params.id])

  const fetchEmail = async () => {
    try {
      const response = await fetch(`/api/emails/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setEmail(data.email)
        setIsStarred(data.email.isStarred)
      }
    } catch (error) {
      console.error("Error fetching email:", error)
      toast({
        title: "Error",
        description: "Failed to load email",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStar = async () => {
    try {
      const response = await fetch(`/api/emails/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: !isStarred }),
      })

      if (response.ok) {
        setIsStarred(!isStarred)
      }
    } catch (error) {
      console.error("Error updating star:", error)
    }
  }

  const generateReply = async (tone: "professional" | "casual" | "brief") => {
    setIsGeneratingReply(true)
    try {
      const response = await fetch(`/api/emails/${params.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone }),
      })

      if (response.ok) {
        const data = await response.json()
        setAiReply(data.suggestion)
      }
    } catch (error) {
      console.error("Error generating reply:", error)
      toast({
        title: "Error",
        description: "Failed to generate reply",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingReply(false)
    }
  }

  const extractData = async () => {
    setIsExtracting(true)
    try {
      const response = await fetch("/api/extract-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: params.id }),
      })

      if (response.ok) {
        const data = await response.json()
        setExtractedData(data.data)
        setShowExtractedMenu(true)
        toast({
          title: "Data Extracted",
          description: `Found ${data.data.events.length} events, ${data.data.tasks.length} tasks`,
        })
      } else {
        throw new Error("Failed to extract data")
      }
    } catch (error) {
      console.error("Error extracting data:", error)
      toast({
        title: "Error",
        description: "Failed to extract data from email",
        variant: "destructive",
      })
    } finally {
      setIsExtracting(false)
    }
  }

  const createEvent = async (event: ExtractedEvent) => {
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: params.id,
          title: event.title,
          description: event.description,
          location: event.location,
          date: event.date,
          time: event.time,
          attendees: event.attendees,
          isAllDay: event.isAllDay,
        }),
      })

      if (response.ok) {
        toast({
          title: "Event Created",
          description: `"${event.title}" has been added to your calendar`,
        })
        setExtractedData(prev => prev ? {
          ...prev,
          events: prev.events.filter(e => e !== event),
        } : null)
      }
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      })
    }
  }

  const createTask = async (task: ExtractedTask) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: params.id,
          title: task.taskName,
          deadline: task.deadline,
          priority: task.priority,
        }),
      })

      if (response.ok) {
        toast({
          title: "Task Created",
          description: `"${task.taskName}" has been added to your tasks`,
        })
        setExtractedData(prev => prev ? {
          ...prev,
          tasks: prev.tasks.filter(t => t !== task),
        } : null)
      }
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      })
    }
  }

  const saveNote = async () => {
    if (!extractedData?.summary) return

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: params.id,
          title: `Summary: ${email.subject}`,
          content: extractedData.summary,
          tags: ["email-summary"],
        }),
      })

      if (response.ok) {
        toast({
          title: "Note Saved",
          description: "Email summary has been saved to your notes",
        })
      }
    } catch (error) {
      console.error("Error saving note:", error)
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      })
    }
  }

  const openReply = () => {
    setReplyType("reply")
    setShowCompose(true)
  }

  const openForward = () => {
    setReplyType("forward")
    setShowCompose(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-lg font-medium">Email not found</p>
        <Link href="/">
          <Button className="mt-4" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inbox
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={toggleStar}>
          {isStarred ? (
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          ) : (
            <Star className="h-5 w-5" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={openReply}>
          <Reply className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={openForward}>
          <Forward className="h-5 w-5" />
        </Button>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold mb-4">{email.subject}</h1>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={extractData}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Extract Data
          </Button>
          
          {extractedData && (
            <>
              {extractedData.events.length > 0 && (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createEvent(extractedData.events[0])}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Add to Calendar
                    <span className="ml-1 bg-primary/20 px-1.5 py-0.5 rounded text-xs">
                      {extractedData.events.length}
                    </span>
                  </Button>
                </div>
              )}
              
              {extractedData.tasks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createTask(extractedData.tasks[0])}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Create Task
                  <span className="ml-1 bg-primary/20 px-1.5 py-0.5 rounded text-xs">
                    {extractedData.tasks.length}
                  </span>
                </Button>
              )}
              
              {extractedData.summary && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveNote}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Save as Note
                </Button>
              )}
            </>
          )}
        </div>

        {/* Energy Rating Section */}
        <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">How did this email affect your energy?</span>
          </div>
          <EnergyRatingButtons
            emailId={params.id as string}
            compact={false}
            onRated={() => {
              toast({
                title: "Energy Rating Saved",
                description: "Thanks for rating! Check the Energy Budget dashboard for insights.",
              })
            }}
          />
        </div>

        {/* Extracted Data Preview */}
        {extractedData && (extractedData.events.length > 0 || extractedData.tasks.length > 0 || extractedData.summary) && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">Extracted Information</span>
            </div>
            
            {extractedData.events.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Events:</p>
                {extractedData.events.map((event, idx) => (
                  <div key={idx} className="text-sm bg-background p-2 rounded mb-1 flex items-center justify-between">
                    <span>{event.title} - {event.date} {event.time}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => createEvent(event)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {extractedData.tasks.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium mb-1">Tasks:</p>
                {extractedData.tasks.map((task, idx) => (
                  <div key={idx} className="text-sm bg-background p-2 rounded mb-1 flex items-center justify-between">
                    <span>{task.taskName} {task.deadline && `(${task.deadline})`}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => createTask(task)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            {extractedData.summary && (
              <div>
                <p className="text-sm font-medium mb-1">Summary:</p>
                <p className="text-sm text-muted-foreground">{extractedData.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Sender info */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium">
            {email.from.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{email.from}</p>
            <p className="text-sm text-muted-foreground">
              {email.fromEmail}
            </p>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            {formatDate(email.receivedAt)}
          </div>
        </div>

        {/* Recipients */}
        <div className="mb-4 text-sm">
          <p>
            <span className="text-muted-foreground">To: </span>
            {email.to}
          </p>
          {email.cc && (
            <p>
              <span className="text-muted-foreground">Cc: </span>
              {email.cc}
            </p>
          )}
        </div>

        {/* Email body */}
        <div className="prose prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ __html: email.bodyHtml || email.body }} />
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Attachments ({email.attachments.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {email.attachments.map((att: any) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border"
                >
                  <div className="flex-shrink-0">
                    {att.mimeType?.includes("image") ? (
                      <img
                        src="data:image/png;base64,..." 
                        alt={att.filename}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={att.filename}>
                      {att.filename}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(att.fileSize)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={att.storageUrl} download={att.filename}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Reply Suggestions */}
        <div className="mt-8 p-4 border-t border-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-medium">AI Reply Suggestions</span>
          </div>
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReply("brief")}
              disabled={isGeneratingReply}
            >
              Brief
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReply("professional")}
              disabled={isGeneratingReply}
            >
              Professional
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReply("casual")}
              disabled={isGeneratingReply}
            >
              Casual
            </Button>
          </div>
          {aiReply && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{aiReply}</p>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => {
                  setReplyType("reply")
                  setShowCompose(true)
                }}
              >
                Use This Reply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        replyTo={replyType === "reply" ? email : undefined}
        forward={replyType === "forward" ? email : undefined}
        initialBody={aiReply}
      />
    </div>
  )
}
