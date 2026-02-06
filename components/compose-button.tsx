"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ComposeModal } from "@/components/compose-modal"

export function ComposeButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
      <ComposeModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
