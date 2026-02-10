"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EnergyRatingModalProps {
  isOpen: boolean
  onClose: () => void
  onRate: (level: 1 | 2 | 3, notes?: string) => void
  emailSubject?: string
  senderName?: string
}

export function EnergyRatingModal({
  isOpen,
  onClose,
  onRate,
  emailSubject,
  senderName,
}: EnergyRatingModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3 | null>(null)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (selectedLevel === null) return
    
    setIsSubmitting(true)
    try {
      await onRate(selectedLevel, notes)
      setSelectedLevel(null)
      setNotes("")
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const energyOptions = [
    {
      level: 1 as const,
      icon: "😮‍💨",
      label: "Drained",
      description: "This email left me feeling exhausted or overwhelmed",
      color: "border-red-300 bg-red-50 hover:bg-red-100",
      selectedColor: "border-red-500 bg-red-200 ring-2 ring-red-500",
    },
    {
      level: 2 as const,
      icon: "😐",
      label: "Neutral",
      description: "This email had no significant impact on my energy",
      color: "border-gray-300 bg-gray-50 hover:bg-gray-100",
      selectedColor: "border-gray-500 bg-gray-200 ring-2 ring-gray-500",
    },
    {
      level: 3 as const,
      icon: "⚡",
      label: "Energized",
      description: "This email left me feeling motivated or inspired",
      color: "border-green-300 bg-green-50 hover:bg-green-100",
      selectedColor: "border-green-500 bg-green-200 ring-2 ring-green-500",
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Rate Email Energy</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <span className="sr-only">Close</span>
              ×
            </Button>
          </div>

          {emailSubject && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm truncate">{emailSubject}</p>
              {senderName && <p className="text-xs text-muted-foreground mt-1">From: {senderName}</p>}
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-4">
            How did this email affect your energy level?
          </p>

          <div className="space-y-3 mb-4">
            {energyOptions.map((option) => (
              <button
                key={option.level}
                onClick={() => setSelectedLevel(option.level)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 transition-all text-left",
                  selectedLevel === option.level
                    ? option.selectedColor
                    : `${option.color} hover:border-opacity-50`
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{option.icon}</span>
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why did this email affect your energy?"
              className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedLevel === null || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Saving..." : "Save Rating"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple inline rating buttons for email view
interface EnergyRatingButtonsProps {
  emailId: string
  onRated?: () => void
  compact?: boolean
}

export function EnergyRatingButtons({ emailId, onRated, compact = false }: EnergyRatingButtonsProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleRate = async (level: 1 | 2 | 3) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/energy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, energyLevel: level }),
      })

      if (response.ok) {
        onRated?.()
      }
    } catch (error) {
      console.error("Error saving energy rating:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (compact) {
    return (
      <div className="flex gap-1">
        <button
          onClick={() => handleRate(1)}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
          title="Drained"
        >
          😮‍💨
        </button>
        <button
          onClick={() => handleRate(2)}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          title="Neutral"
        >
          😐
        </button>
        <button
          onClick={() => handleRate(3)}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-green-100 text-green-500 transition-colors"
          title="Energized"
        >
          ⚡
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleRate(1)}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 p-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
      >
        <span className="text-2xl">😮‍💨</span>
        <span className="text-xs font-medium text-red-600">Drained</span>
      </button>
      <button
        onClick={() => handleRate(2)}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-2xl">😐</span>
        <span className="text-xs font-medium text-gray-600">Neutral</span>
      </button>
      <button
        onClick={() => handleRate(3)}
        disabled={isLoading}
        className="flex flex-col items-center gap-1 p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
      >
        <span className="text-2xl">⚡</span>
        <span className="text-xs font-medium text-green-600">Energized</span>
      </button>
    </div>
  )
}
