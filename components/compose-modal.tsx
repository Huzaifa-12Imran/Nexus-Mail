"use client"

import { useState, useEffect } from "react"
import { X, Sparkles, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

interface ComposeModalProps {
  isOpen: boolean
  onClose: () => void
  replyTo?: {
    fromEmail: string
    subject: string
    body: string
    threadId?: string
  }
  initialBody?: string | null
  forward?: {
    fromEmail: string
    subject: string
    body: string
  }
}

export function ComposeModal({
  isOpen,
  onClose,
  replyTo,
  initialBody,
  forward,
}: ComposeModalProps) {
  const [to, setTo] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (replyTo) {
      setTo(replyTo.fromEmail)
      setSubject(replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`)
      setBody(
        `\n\nOn ${new Date().toLocaleDateString()}, ${replyTo.fromEmail} wrote:\n${replyTo.body}`
      )
    } else if (forward) {
      setSubject(forward.subject.startsWith("Fwd:") ? forward.subject : `Fwd: ${forward.subject}`)
      setBody(
        `\n\n---------- Forwarded message ---------\nFrom: ${forward.fromEmail}\nDate: ${new Date().toLocaleDateString()}\nSubject: ${forward.subject}\n${forward.body}`
      )
    } else if (initialBody) {
      setBody(initialBody)
    }
  }, [replyTo, forward, initialBody])

  const generateAiSuggestion = async () => {
    if (!subject || !body) {
      toast({
        title: "Need more content",
        description: "Please enter a subject and body to generate a suggestion.",
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/emails/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, tone: "professional" }),
      })

      if (response.ok) {
        const data = await response.json()
        setBody((prev) => `${prev}\n\n${data.suggestion}`)
      }
    } catch (error) {
      console.error("Error generating suggestion:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSend = async () => {
    if (!to || !subject) {
      toast({
        title: "Missing fields",
        description: "Please fill in the recipient and subject.",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.split(",").map((email) => email.trim()),
          subject,
          body,
          threadId: replyTo?.threadId,
          connectionId: localStorage.getItem("selectedConnectionId"),
        }),
      })

      if (response.ok) {
        toast({
          title: "Email sent",
          description: "Your email has been sent successfully.",
        })
        setTo("")
        setSubject("")
        setBody("")
        onClose()
      } else {
        throw new Error("Failed to send email")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-2xl m-4 compose-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">
            {replyTo ? "Reply" : forward ? "Forward" : "New Message"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Compose form */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-14">To:</span>
            <Input
              placeholder="recipient@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-14">Subject:</span>
            <Input
              placeholder="Enter subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="border rounded-lg min-h-[200px]">
            <textarea
              className="w-full h-full min-h-[200px] p-3 resize-none outline-none"
              placeholder="Write your message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSending ? "Sending..." : "Send"}
            </Button>
            <Button variant="outline" onClick={generateAiSuggestion} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              AI Assist
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
