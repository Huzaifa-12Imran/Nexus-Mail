'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

interface SnoozeModalProps {
  isOpen: boolean
  onClose: () => void
  emailId: string
  onSnooze: (snoozeUntil: string) => Promise<void>
}

export function SnoozeModal({ isOpen, onClose, emailId, onSnooze }: SnoozeModalProps) {
  const [selectedOption, setSelectedOption] = useState<string>('tomorrow')
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  if (!isOpen) return null

  const getSnoozeDateTime = (): Date => {
    const now = new Date()
    
    switch (selectedOption) {
      case 'today':
        return new Date(now.setHours(now.getHours() + 4, 0, 0, 0))
      case 'tomorrow':
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(9, 0, 0, 0)
        return tomorrow
      case 'nextWeek':
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)
        nextWeek.setHours(9, 0, 0, 0)
        return nextWeek
      case 'custom':
        if (customDate && customTime) {
          return new Date(`${customDate}T${customTime}`)
        }
        // Fallback to tomorrow
        const fallback = new Date(now)
        fallback.setDate(fallback.getDate() + 1)
        fallback.setHours(9, 0, 0, 0)
        return fallback
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }
  }

  const handleSnooze = async () => {
    setIsLoading(true)
    try {
      const snoozeUntil = getSnoozeDateTime()
      await onSnooze(snoozeUntil.toISOString())
      toast({
        title: 'Email snoozed',
        description: `Email will return ${snoozeUntil.toLocaleDateString()} at ${snoozeUntil.toLocaleTimeString()}`,
      })
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to snooze email',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatOptionLabel = (option: string): string => {
    switch (option) {
      case 'today':
        return 'Later Today'
      case 'tomorrow':
        return 'Tomorrow'
      case 'nextWeek':
        return 'Next Week'
      case 'custom':
        return 'Pick a date & time'
      default:
        return option
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Snooze Email</h2>
        
        <div className="space-y-3 mb-6">
          {['tomorrow', 'nextWeek', 'today', 'custom'].map((option) => (
            <label
              key={option}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedOption === option
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="snoozeOption"
                value={option}
                checked={selectedOption === option}
                onChange={() => setSelectedOption(option)}
                className="mr-3"
              />
              <span className="font-medium">{formatOptionLabel(option)}</span>
            </label>
          ))}
        </div>

        {selectedOption === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <Input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSnooze} disabled={isLoading}>
            {isLoading ? 'Snoozing...' : 'Snooze'}
          </Button>
        </div>
      </div>
    </div>
  )
}
