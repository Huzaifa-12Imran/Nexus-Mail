'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, Plus, Star } from 'lucide-react'

interface PrioritySender {
  id: string
  email: string
  name?: string | null
  createdAt: string
}

interface PrioritySendersManagerProps {
  onClose?: () => void
}

export function PrioritySendersManager({ onClose }: PrioritySendersManagerProps) {
  const [senders, setSenders] = useState<PrioritySender[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSenders()
  }, [])

  const fetchSenders = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/priority-senders')
      const data = await response.json()
      if (data.prioritySenders) {
        setSenders(data.prioritySenders)
      }
    } catch (error) {
      console.error('Error fetching priority senders:', error)
      toast({
        title: 'Error',
        description: 'Failed to load priority senders',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSender = async () => {
    if (!newEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/priority-senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: newEmail.toLowerCase().trim(),
          name: newName.trim() || undefined
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setSenders([data.prioritySender, ...senders])
        setNewEmail('')
        setNewName('')
        toast({
          title: 'Success',
          description: `${newEmail} added to priority senders`,
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add priority sender',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add priority sender',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveSender = async (id: string, email: string) => {
    try {
      await fetch(`/api/priority-senders?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
      setSenders(senders.filter(s => s.id !== id))
      toast({
        title: 'Removed',
        description: `${email} removed from priority senders`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove priority sender',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Add new sender */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-3">Add Priority Sender</h3>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1"
          />
          <Input
            type="text"
            placeholder="Name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-40"
          />
          <Button onClick={handleAddSender} disabled={isSaving}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* List of priority senders */}
      <div>
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          Priority Senders ({senders.length})
        </h3>
        
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : senders.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No priority senders added yet
          </div>
        ) : (
          <div className="space-y-2">
            {senders.map((sender) => (
              <div
                key={sender.id}
                className="flex items-center justify-between p-3 bg-white border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {sender.name ? sender.name[0].toUpperCase() : sender.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{sender.name || sender.email}</div>
                    <div className="text-sm text-gray-500">{sender.email}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSender(sender.id, sender.email)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
        <p>
          <strong>Priority Senders:</strong> Emails from these contacts will always 
          appear in your Primary inbox, ensuring you never miss important messages.
        </p>
      </div>
    </div>
  )
}
