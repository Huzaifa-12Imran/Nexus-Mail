'use client'

import { Star } from 'lucide-react'
import { PrioritySendersManager } from '@/components/priority-senders-manager'

export default function PrioritySendersPage() {
  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          Priority Senders
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <PrioritySendersManager />
      </div>
    </div>
  )
}
