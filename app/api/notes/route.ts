// Notes API - Save and manage notes from email summaries
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { 
      emailId,
      title, 
      content,
      tags,
      extractedSummary
    } = await req.json()

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    // Create the note in database
    const note = await prisma.note.create({
      data: {
        userId: user.id,
        title,
        content,
        tags: tags ? JSON.stringify(tags) : null,
        relatedEmailId: emailId,
      },
    })

    return NextResponse.json({
      success: true,
      note,
    })
  } catch (error: any) {
    console.error("Create note error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create note" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")

    const whereClause: any = {
      userId: user.id,
      deletedAt: null,
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Parse tags from JSON string
    const parsedNotes = notes.map(note => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : [],
    }))

    return NextResponse.json({
      success: true,
      notes: parsedNotes,
    })
  } catch (error: any) {
    console.error("Get notes error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch notes" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { noteId, title, content, tags } = await req.json()

    if (!noteId) {
      return NextResponse.json({ error: "Note ID is required" }, { status: 400 })
    }

    // Verify note belongs to user
    const existingNote = await prisma.note.findFirst({
      where: { id: noteId, userId: user.id },
    })

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    const updateData: any = {}
    if (title) updateData.title = title
    if (content) updateData.content = content
    if (tags) updateData.tags = JSON.stringify(tags)

    const note = await prisma.note.update({
      where: { id: noteId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      note: {
        ...note,
        tags: note.tags ? JSON.parse(note.tags) : [],
      },
    })
  } catch (error: any) {
    console.error("Update note error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update note" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const noteId = searchParams.get("id")

    if (!noteId) {
      return NextResponse.json({ error: "Note ID is required" }, { status: 400 })
    }

    // Soft delete the note
    await prisma.note.update({
      where: { id: noteId, userId: user.id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: "Note deleted successfully",
    })
  } catch (error: any) {
    console.error("Delete note error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete note" },
      { status: 500 }
    )
  }
}
