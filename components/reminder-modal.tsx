'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

interface ReminderModalProps {
  isOpen: boolean
  onClose: () => void
  emailId?: string
  emailSubject?: string
  onCreateReminder: (reminder: { title: string; message?: string; remindAt: string }) => Promise<void>
}

export function ReminderModal({ 
  isOpen, 
  onClose, 
  emailId, 
  emailSubject,
  onCreateReminder 
}: ReminderModalProps) {
  const [title, setTitle] = useState(emailSubject ? `Follow up: ${emailSubject}` : '')
  const [message, setMessage] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  if (!isOpen) return null

  const getMinDateTime = (): string => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title for the reminder',
        variant: 'destructive',
      })
      return
    }

    if (!date || !time) {
      toast({
        title: 'Error',
        description: 'Please select a date and time',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const remindAt = new Date(`${date}T${time}`).toISOString()
      await onCreateReminder({
        title: title.trim(),
        message: message.trim() || undefined,
        remindAt
      })
      toast({
        title: 'Reminder created',
        description: `You'll be reminded on ${new Date(remindAt).toLocaleString()}`,
      })
      onClose()
      // Reset form
      setTitle(emailSubject ? `Follow up: ${emailSubject}` : '')
      setMessage('')
      setDate('')
      setTime('')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create reminder',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const quickOptions = [
    { label: 'In 1 hour', hours: 1 },
    { label: 'Tomorrow morning', hours: 24 },
    { label: 'Next week', hours: 168 },
    { label: 'Custom', hours: null }
  ]

  const handleQuickOption = (hours: number | null) => {
    if (hours === null) {
      // Set to custom mode - user selects manually
      return
    }
    
    const now = new Date()
    now.setHours(now.getHours() + hours)
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hoursStr = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    
    setDate(`${year}-${month}-${day}`)
    setTime(`${hoursStr}:${minutes}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Set Reminder</h2>
        
        <div className="space-y-4 mb-6">
          {/* Quick options */}
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <Button
                key={option.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickOption(option.hours)}
                className="text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to be reminded about?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add additional notes..."
              className="w-full p-2 border rounded-lg text-sm resize-none h-20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={getMinDateTime().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time *
              </label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Reminder'}
          </Button>
        </div>
      </div>
    </div>
  )
}
