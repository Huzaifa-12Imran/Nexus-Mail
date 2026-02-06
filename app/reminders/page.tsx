'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Clock, Loader2, RefreshCw, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ReminderModal } from '@/components/reminder-modal'
import { formatDate } from '@/lib/utils'

interface Reminder {
  id: string
  userId: string
  emailId?: string
  title: string
  message?: string
  remindAt: string
  isCompleted: boolean
  createdAt: string
  email?: {
    from: string
    fromEmail: string
    subject: string
  }
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/reminders')
      if (response.ok) {
        const data = await response.json()
        setReminders(data.reminders || [])
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
      toast({
        title: 'Error',
        description: 'Failed to load reminders',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteReminder = async (id: string) => {
    try {
      await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isCompleted: true }),
      })
      setReminders((prev) => prev.filter((r) => r.id !== id))
      toast({
        title: 'Reminder completed',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete reminder',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteReminder = async (id: string) => {
    try {
      await fetch(`/api/reminders?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      setReminders((prev) => prev.filter((r) => r.id !== id))
      toast({
        title: 'Reminder deleted',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete reminder',
        variant: 'destructive',
      })
    }
  }

  const handleCreateReminder = async (reminder: { title: string; message?: string; remindAt: string }) => {
    const response = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reminder),
    })
    
    if (response.ok) {
      const data = await response.json()
      setReminders([data.reminder, ...reminders])
    }
  }

  // Group reminders by date
  const groupedReminders = reminders.reduce((acc, reminder) => {
    const date = new Date(reminder.remindAt).toDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(reminder)
    return acc
  }, {} as Record<string, Reminder[]>)

  const sortedDates = Object.keys(groupedReminders).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  )

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Reminders
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchReminders}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowReminderModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Reminder
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Bell className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No reminders</p>
            <p className="text-sm">Set reminders to follow up on important emails</p>
            <Button className="mt-4" onClick={() => setShowReminderModal(true)}>
              Create Reminder
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedDates.map((date) => (
              <div key={date} className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                <div className="space-y-2">
                  {groupedReminders[date].map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-start gap-3 p-3 bg-card rounded-lg border"
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 mt-0.5"
                        onClick={() => handleCompleteReminder(reminder.id)}
                        title="Mark as done"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{reminder.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(reminder.remindAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {reminder.message && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {reminder.message}
                          </p>
                        )}
                        {reminder.email && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Related to: {reminder.email.subject}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => handleDeleteReminder(reminder.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        onCreateReminder={handleCreateReminder}
      />
    </div>
  )
}
