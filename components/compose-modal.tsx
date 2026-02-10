"use client"

import { useState, useRef, useEffect } from "react"
import { X, Sparkles, Send, Loader2, Mic, Paperclip, FileX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import VoiceRecorder from "@/components/VoiceRecorder"

interface Attachment {
  id: string
  filename: string
  fileType: string
  fileSize: number
  file: File
}

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
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleVoiceComplete = (transcript: string, refinedEmail: string) => {
    const textToAdd = refinedEmail || transcript
    setBody((prev) => (prev ? `${prev}\n\n${textToAdd}` : textToAdd))
    
    if (refinedEmail.includes("Subject:")) {
      const subjectMatch = refinedEmail.match(/Subject: (.*)/)
      if (subjectMatch && subjectMatch[1]) {
        setSubject(subjectMatch[1])
        const bodyWithoutSubject = refinedEmail.replace(/Subject: .*\n+/, "").trim()
        setBody((prev) => (prev ? `${prev}\n\n${bodyWithoutSubject}` : bodyWithoutSubject))
      }
    }
    
    setShowVoiceRecorder(false)
  }

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

  // Cleanup attachments when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAttachments([])
    }
  }, [isOpen])

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
      // Create FormData for multipart email sending
      const formData = new FormData()
      formData.append("to", to)
      formData.append("subject", subject)
      formData.append("body", body)
      
      if (replyTo?.threadId) {
        formData.append("threadId", replyTo.threadId)
      }
      
      const connectionId = localStorage.getItem("selectedConnectionId")
      if (connectionId) {
        formData.append("connectionId", connectionId)
      }
      
      // Append files
      for (const att of attachments) {
        formData.append("files", att.file)
      }

      const response = await fetch("/api/emails", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Email sent",
          description: "Your email has been sent successfully.",
        })
        setTo("")
        setSubject("")
        setBody("")
        setAttachments([])
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newAttachments: Attachment[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const id = `${Date.now()}-${i}-${file.name}`
      newAttachments.push({
        id,
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        file,
      })
    }

    setAttachments((prev) => [...prev, ...newAttachments])
    toast({
      title: "Files attached",
      description: `${newAttachments.length} file(s) attached.`,
    })
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-2xl m-4 compose-modal">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">
            {replyTo ? "Reply" : forward ? "Forward" : "New Message"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {showVoiceRecorder ? (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-center">Record Voice Memo</h3>
            <VoiceRecorder 
              onComplete={handleVoiceComplete} 
              onCancel={() => setShowVoiceRecorder(false)} 
            />
          </div>
        ) : (
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
            
            {/* Attachments Section */}
            {attachments.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="text-sm font-medium text-muted-foreground">
                  Attachments ({attachments.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border text-sm"
                    >
                      <span className="truncate max-w-[200px]">{att.filename}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatFileSize(att.fileSize)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => removeAttachment(att.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="border rounded-lg min-h-[200px]">
              <textarea
                className="w-full h-full min-h-[200px] p-3 resize-none outline-none"
                placeholder="Write your message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.zip,.rar"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Attach
            </Button>
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
            <Button variant="outline" onClick={() => setShowVoiceRecorder(true)} disabled={showVoiceRecorder}>
              <Mic className="h-4 w-4 mr-2" />
              Voice Input
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
