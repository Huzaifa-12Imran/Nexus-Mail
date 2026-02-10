import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const type = searchParams.get("type")
    const hideDuplicates = searchParams.get("hideDuplicates") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Build where clause
    let query = supabase
      .from("attachments")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null)

    if (category) {
      query = query.eq("category", category)
    }

    if (type) {
      const typeExtensions: Record<string, string[]> = {
        image: ["png", "jpg", "jpeg", "gif", "webp"],
        pdf: ["pdf"],
        document: ["doc", "docx", "txt"],
        archive: ["zip", "rar", "7z"],
      }
      query = query.in("file_type", typeExtensions[type] || [type])
    }

    if (hideDuplicates) {
      query = query.eq("is_duplicate", false)
    }

    const { data: attachments, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching attachments:", error)
      return NextResponse.json(
        { error: "Failed to fetch attachments" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      attachments: attachments || [],
      total: count || 0,
      hasMore: offset + (attachments?.length || 0) < (count || 0),
    })
  } catch (error) {
    console.error("Error fetching attachments:", error)
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get("id")

    if (!attachmentId) {
      return NextResponse.json({ error: "Attachment ID required" }, { status: 400 })
    }

    // Soft delete
    const { error } = await supabase
      .from("attachments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", attachmentId)
      .eq("user_id", userId)

    if (error) {
      console.error("Error deleting attachment:", error)
      return NextResponse.json(
        { error: "Failed to delete attachment" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting attachment:", error)
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    )
  }
}
