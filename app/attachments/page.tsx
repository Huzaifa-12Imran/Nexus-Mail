"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Download, Eye, Trash2, Grid, List, FileText, Image, File, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

interface Attachment {
  id: string
  user_id: string
  email_id: string | null
  filename: string
  original_name: string
  file_type: string
  file_size: number
  mime_type: string
  storage_url: string | null
  extracted_text: string | null
  category: string | null
  tags: string[]
  similar_to: string[]
  is_duplicate: boolean
  search_text: string | null
  file_hash: string | null
  created_at: string
  deleted_at: string | null
}

export default function AttachmentsPage() {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [filteredAttachments, setFilteredAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null)
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    fetchAttachments()
  }, [])

  useEffect(() => {
    filterAttachments()
  }, [attachments, searchQuery, selectedCategory, selectedType, showDuplicates])

  const fetchAttachments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Parse JSON fields
      const parsedAttachments = (data || []).map((att: Record<string, unknown>) => ({
        ...att,
        tags: typeof att.tags === "string" ? JSON.parse(att.tags as string) : (att.tags as string[]),
        similar_to: typeof att.similar_to === "string" ? JSON.parse(att.similar_to as string) : (att.similar_to as string[]),
      }))

      setAttachments(parsedAttachments as Attachment[])
    } catch (error) {
      console.error("Error fetching attachments:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterAttachments = () => {
    let filtered = [...attachments]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (att) =>
          att.filename.toLowerCase().includes(query) ||
          att.extracted_text?.toLowerCase().includes(query) ||
          att.category?.toLowerCase().includes(query) ||
          att.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((att) => att.category === selectedCategory)
    }

    // Type filter
    if (selectedType) {
      filtered = filtered.filter((att) => {
        const type = getFileType(att.filename)
        return type === selectedType
      })
    }

    // Hide duplicates filter
    if (!showDuplicates) {
      filtered = filtered.filter((att) => !att.is_duplicate)
    }

    setFilteredAttachments(filtered)
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase()
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) {
      return <Image className="h-8 w-8 text-green-500" />
    }
    if (["pdf"].includes(ext || "")) {
      return <FileText className="h-8 w-8 text-red-500" />
    }
    if (["doc", "docx", "txt"].includes(ext || "")) {
      return <FileText className="h-8 w-8 text-blue-500" />
    }
    if (["zip", "rar", "7z"].includes(ext || "")) {
      return <Archive className="h-8 w-8 text-yellow-500" />
    }
    return <File className="h-8 w-8 text-gray-500" />
  }

  const getFileType = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase()
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) return "image"
    if (["pdf"].includes(ext || "")) return "pdf"
    if (["doc", "docx", "txt"].includes(ext || "")) return "document"
    if (["zip", "rar", "7z"].includes(ext || "")) return "archive"
    return "other"
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // AI-powered semantic search (would call Pinecone in production)
      const response = await fetch(`/api/attachments/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setAttachments(data.attachments)
      }
    } catch (error) {
      console.error("Error searching attachments:", error)
    } finally {
      setLoading(false)
    }
  }

  const categories = Array.from(new Set(attachments.map((att) => att.category).filter(Boolean)))
  const fileTypes = ["image", "pdf", "document", "archive", "other"]

  if (loading && attachments.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Loading attachments...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Attachments</h1>
        <div className="text-sm text-muted-foreground">
          {filteredAttachments.length} files
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search attachments... (AI-powered)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory || ""}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat as string}>{cat as string}</option>
            ))}
          </select>
          <select
            value={selectedType || ""}
            onChange={(e) => setSelectedType(e.target.value || null)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Types</option>
            {fileTypes.map((type) => (
              <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            ))}
          </select>
          <Button
            variant={showDuplicates ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDuplicates(!showDuplicates)}
          >
            {showDuplicates ? "Show Unique" : "Hide Duplicates"}
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Duplicate Warning */}
      {attachments.some((att) => att.is_duplicate) && !showDuplicates && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ {attachments.filter((att) => att.is_duplicate).length} duplicate files hidden. 
            Toggle "Hide Duplicates" to see all.
          </p>
        </div>
      )}

      {/* Attachment Grid/List */}
      {filteredAttachments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No attachments found.
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAttachments.map((att) => (
            <div
              key={att.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                att.is_duplicate ? "opacity-60 bg-yellow-50" : ""
              }`}
              onClick={() => setSelectedAttachment(att)}
            >
              <div className="flex items-center justify-center h-16 mb-3">
                {getFileIcon(att.filename)}
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm truncate" title={att.filename}>
                  {att.filename}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(att.file_size)}</span>
                  <span>{formatDate(att.created_at)}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {att.category && (
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                      {att.category}
                    </span>
                  )}
                  {att.is_duplicate && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                      Duplicate
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAttachments.map((att) => (
            <div
              key={att.id}
              className={`flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer ${
                att.is_duplicate ? "opacity-60 bg-yellow-50" : ""
              }`}
              onClick={() => setSelectedAttachment(att)}
            >
              {getFileIcon(att.filename)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{att.filename}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {att.extracted_text?.slice(0, 100) || "No preview available"}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {att.category && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                    {att.category}
                  </span>
                )}
                <span>{formatFileSize(att.file_size)}</span>
                <span>{formatDate(att.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attachment Detail Modal */}
      {selectedAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedAttachment(null)} />
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-2xl m-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-lg font-semibold">{selectedAttachment.filename}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedAttachment(null)}>
                ×
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Size:</span>
                  <span className="ml-2">{formatFileSize(selectedAttachment.file_size)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2">{selectedAttachment.mime_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <span className="ml-2">{selectedAttachment.category || "Uncategorized"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <span className="ml-2">{formatDate(selectedAttachment.created_at)}</span>
                </div>
              </div>

              {selectedAttachment.tags.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedAttachment.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-secondary rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedAttachment.is_duplicate && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ This file may be a duplicate. Check similar files before downloading.
                  </p>
                </div>
              )}

              <div>
                <span className="text-sm text-muted-foreground">Preview:</span>
                <div className="mt-2 p-3 bg-muted rounded-lg max-h-48 overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap">
                    {selectedAttachment.extracted_text || "No preview available"}
                  </pre>
                </div>
              </div>

              <div className="flex gap-2">
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" className="ml-auto text-red-500">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back button */}
      <div className="mt-6">
        <Button variant="ghost" onClick={() => window.history.back()}>
          ← Back to Inbox
        </Button>
      </div>
    </div>
  )
}
