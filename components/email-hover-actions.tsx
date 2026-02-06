'use client'

import { useState } from 'react'
import { Star, Trash2, Archive, Bell, Clock, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { SnoozeModal } from '@/components/snooze-modal'
import { ReminderModal } from '@/components/reminder-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface EmailHoverActionsProps {
  emailId: string
  emailSubject: string
  fromEmail: string
  isStarred: boolean
  onToggleStar?: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
  onSnooze?: (emailId: string, snoozeUntil: string) => Promise<void>
  onSetReminder?: (emailId: string, reminder: { title: string; message?: string; remindAt: string }) => Promise<void>
}

export function EmailHoverActions({
  emailId,
  emailSubject,
  fromEmail,
  isStarred,
  onToggleStar,
  onArchive,
  onDelete,
  onSnooze,
  onSetReminder,
}: EmailHoverActionsProps) {
  const [showSnoozeModal, setShowSnoozeModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const { toast } = useToast()

  const handleSnooze = async (snoozeUntil: string) => {
    if (onSnooze) {
      await onSnooze(emailId, snoozeUntil)
    } else {
      try {
        await fetch(`/api/emails/${emailId}/snooze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snoozeUntil }),
        })
        toast({
          title: 'Email snoozed',
          description: 'The email will return at the specified time',
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to snooze email',
          variant: 'destructive',
        })
      }
    }
  }

  const handleSetReminder = async (reminder: { title: string; message?: string; remindAt: string }) => {
    if (onSetReminder) {
      await onSetReminder(emailId, reminder)
    } else {
      try {
        await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailId,
            title: reminder.title,
            message: reminder.message,
            remindAt: reminder.remindAt,
          }),
        })
        toast({
          title: 'Reminder set',
          description: 'You will be reminded about this email',
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to set reminder',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Star button */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 ${isStarred ? 'text-yellow-500' : 'text-muted-foreground'}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar?.(emailId)
          }}
          title={isStarred ? 'Unstar' : 'Star'}
        >
          <Star className="h-3.5 w-3.5" fill={isStarred ? 'currentColor' : 'none'} />
        </Button>

        {/* Archive button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-amber-600"
          onClick={(e) => {
            e.stopPropagation()
            onArchive?.(emailId)
          }}
          title="Archive"
        >
          <Archive className="h-3.5 w-3.5" />
        </Button>

        {/* Snooze button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-blue-600"
          onClick={(e) => {
            e.stopPropagation()
            setShowSnoozeModal(true)
          }}
          title="Snooze"
        >
          <Clock className="h-3.5 w-3.5" />
        </Button>

        {/* Reminder button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-green-600"
          onClick={(e) => {
            e.stopPropagation()
            setShowReminderModal(true)
          }}
          title="Set reminder"
        >
          <Bell className="h-3.5 w-3.5" />
        </Button>

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                onDelete?.(emailId)
              }}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modals */}
      <SnoozeModal
        isOpen={showSnoozeModal}
        onClose={() => setShowSnoozeModal(false)}
        emailId={emailId}
        onSnooze={handleSnooze}
      />

      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        emailId={emailId}
        emailSubject={emailSubject}
        onCreateReminder={handleSetReminder}
      />
    </>
  )
}
