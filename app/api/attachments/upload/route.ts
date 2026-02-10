import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createHash } from "crypto"

// OpenRouter API for embeddings
async function getOpenRouterEmbedding(input: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  
  if (!apiKey) {
    console.log("No OpenRouter API key configured")
    return null
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nexus-mail.app",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: input.slice(0, 8000),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("OpenRouter API error:", error)
      return null
    }

    const data = await response.json()
    return data.data?.[0]?.embedding || null
  } catch (error: any) {
    console.error("Error calling OpenRouter:", error?.message || error)
    return null
  }
}

// File type categorization
const CATEGORIES: Record<string, string> = {
  pdf: "Document",
  doc: "Document", docx: "Document",
  xls: "Spreadsheet", xlsx: "Spreadsheet",
  ppt: "Presentation", pptx: "Presentation",
  txt: "Text",
  csv: "Data",
  png: "Image", jpg: "Image", jpeg: "Image", gif: "Image", webp: "Image",
  zip: "Archive", rar: "Archive", "7z": "Archive",
}

// Get category from file extension
function getCategory(filename: string, mimeType: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  
  // Check by extension first
  if (CATEGORIES[ext]) {
    return CATEGORIES[ext]
  }
  
  // Check by mime type
  if (mimeType.includes("pdf")) return "Document"
  if (mimeType.includes("image")) return "Image"
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Spreadsheet"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "Presentation"
  if (mimeType.includes("text")) return "Text"
  
  return "Other"
}

// Calculate file hash for duplicate detection
async function calculateFileHash(buffer: Buffer): Promise<string> {
  return createHash("sha256").update(buffer).digest("hex")
}

// Calculate name similarity
function calculateNameSimilarity(name1: string, name2: string): number {
  const normalized1 = name1.toLowerCase().replace(/[^a-z0-9]/g, "")
  const normalized2 = name2.toLowerCase().replace(/[^a-z0-9]/g, "")
  
  if (normalized1 === normalized2) return 1
  
  const longer = normalized1.length > normalized2.length ? normalized1 : normalized2
  const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1
  
  if (longer.startsWith(shorter)) return shorter.length / longer.length
  
  return 0
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      var userId = session.user.id
    } else {
      var userId = user.id
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const attachmentIds: string[] = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const fileHash = await calculateFileHash(buffer)
      
      // Check for duplicates in Supabase
      const { data: existingAttachments } = await supabase
        .from("attachments")
        .select("id, filename, file_size")
        .eq("user_id", userId)
        .eq("file_hash", fileHash)
        .is("deleted_at", null)

      // Check for similar files (same size, similar name)
      const { data: similarAttachments } = await supabase
        .from("attachments")
        .select("id, filename")
        .eq("user_id", userId)
        .eq("file_size", file.size)
        .is("deleted_at", null)

      const similarTo: string[] = []
      const isDuplicate = existingAttachments && existingAttachments.length > 0

      // Find similar files by name
      if (similarAttachments) {
        for (const existing of similarAttachments) {
          const similarity = calculateNameSimilarity(file.name, existing.filename || "")
          if (similarity > 0.8) {
            similarTo.push(existing.id)
          }
        }
      }

      // Get file extension
      const ext = file.name.split(".").pop()?.toLowerCase() || ""
      
      // Storage URL
      const storageUrl = `/storage/attachments/${userId}/${Date.now()}-${file.name}`
      
      // Extracted text placeholder
      const extractedText = `[File: ${file.name}]\nSize: ${file.size} bytes\nType: ${file.type}`
      
      // Generate embedding
      const embedding = await getOpenRouterEmbedding(extractedText)
      
      // Auto-categorize
      const category = getCategory(file.name, file.type)

      // Create attachment record in Supabase
      const attachmentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const { error: insertError } = await supabase
        .from("attachments")
        .insert({
          id: attachmentId,
          user_id: userId,
          filename: file.name,
          original_name: file.name,
          file_type: ext,
          file_size: file.size,
          mime_type: file.type,
          storage_url: storageUrl,
          extracted_text: extractedText,
          category: category,
          tags: JSON.stringify([]),
          embedding: embedding ? JSON.stringify(embedding) : null,
          file_hash: fileHash,
          similar_to: JSON.stringify(similarTo),
          is_duplicate: isDuplicate,
          search_text: `${file.name} ${category} ${extractedText}`,
        })

      if (insertError) {
        console.error("Error inserting attachment:", insertError)
        continue
      }

      attachmentIds.push(attachmentId)

      // Log duplicate warnings
      if (existingAttachments && existingAttachments.length > 0) {
        console.log(`Duplicate detected: ${file.name} matches existing files`)
      }
      if (similarTo.length > 0) {
        console.log(`Similar files found for: ${file.name}`)
      }
    }

    return NextResponse.json({
      success: true,
      attachmentIds,
      message: `${files.length} file(s) uploaded successfully`,
    })
  } catch (error) {
    console.error("Error uploading attachments:", error)
    return NextResponse.json(
      { error: "Failed to upload attachments" },
      { status: 500 }
    )
  }
}
