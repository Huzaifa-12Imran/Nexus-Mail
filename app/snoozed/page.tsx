'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Loader2, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface SnoozedEmail {
  id: string
  emailId: string
  snoozeUntil: string
  folder: string
  createdAt: string
  email: {
    from: string
    fromEmail: string
    subject: string
    snippet?: string
  }
}

export default function SnoozedPage() {
  const router = useRouter()
  const [snoozedEmails, setSnoozedEmails] = useState<SnoozedEmail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchSnoozedEmails()
  }, [])

  const fetchSnoozedEmails = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/snoozed')
      if (response.ok) {
        const data = await response.json()
        setSnoozedEmails(data.snoozedEmails || [])
      }
    } catch (error) {
      console.error('Error fetching snoozed emails:', error)
      toast({
        title: 'Error',
        description: 'Failed to load snoozed emails',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsnooze = async (emailId: string) => {
    try {
      await fetch(`/api/emails/${emailId}/snooze`, {
        method: 'DELETE',
      })
      setSnoozedEmails((prev) => prev.filter((e) => e.emailId !== emailId))
      toast({
        title: 'Email moved to inbox',
        description: 'The email is now visible in your inbox',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to unsnooze email',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Snoozed
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchSnoozedEmails}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : snoozedEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Clock className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No snoozed emails</p>
            <p className="text-sm">Emails you snooze will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {snoozedEmails.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{item.email.from}</span>
                    <span className="text-xs text-muted-foreground">
                      (returns {formatDate(item.snoozeUntil)})
                    </span>
                  </div>
                  <p className="text-sm truncate">{item.email.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.email.snippet}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnsnooze(item.emailId)}
                  >
                    Move to Inbox
                  </Button>
                  <Link href={`/email/${item.emailId}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
