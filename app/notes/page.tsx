"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { FileText, Search, Tag, Plus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const url = search 
        ? `/api/notes?search=${encodeURIComponent(search)}`
        : "/api/notes"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes)
      }
    } catch (error) {
      console.error("Error fetching notes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    fetchNotes()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Notes
          </h1>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notes found</p>
          <p className="text-sm">Save email summaries to see them here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(note => (
            <div 
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <h3 className="font-semibold mb-2 line-clamp-1">{note.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {note.content}
              </p>
              <div className="flex items-center gap-2">
                {note.tags && note.tags.map(tag => (
                  <span 
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Note Detail Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{selectedNote.title}</h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedNote(null)}
                >
                  ×
                </Button>
              </div>
              
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {selectedNote.tags.map(tag => (
                    <span 
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{selectedNote.content}</p>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                Created: {new Date(selectedNote.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
