'use client'

import { useRouter } from 'next/navigation'
import { Star, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrioritySendersManager } from '@/components/priority-senders-manager'

export default function PrioritySendersPage() {
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Priority Senders
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <PrioritySendersManager />
      </div>
    </div>
  )
}
