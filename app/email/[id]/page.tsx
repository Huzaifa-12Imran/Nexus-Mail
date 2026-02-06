"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Star, Reply, Forward, Sparkles, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { ComposeModal } from "@/components/compose-modal"

export default function EmailDetailPage() {
  const params = useParams()
  const [email, setEmail] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarred, setIsStarred] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [replyType, setReplyType] = useState<"reply" | "forward">("reply")
  const { toast } = useToast()

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

  const generateSummary = async () => {
    if (aiSummary) return

    try {
      const response = await fetch(`/api/emails/${params.id}/summarize`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setAiSummary(data.summary)
      }
    } catch (error) {
      console.error("Error generating summary:", error)
      toast({
        title: "Error",
        description: "Failed to generate summary",
        variant: "destructive",
      })
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

        {/* AI Summary */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-medium">AI Summary</span>
          </div>
          {aiSummary ? (
            <p className="text-muted-foreground">{aiSummary}</p>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={generateSummary}
            >
              Generate Summary
            </Button>
          )}
        </div>

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
