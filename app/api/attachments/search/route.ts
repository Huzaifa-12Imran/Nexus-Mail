import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Search query required" }, { status: 400 })
    }

    // Fallback to text search using Supabase
    // Note: For full semantic search, pgvector would need to be enabled
    const { data: attachments, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .eq("is_duplicate", false)
      .or(`filename.ilike.%${query}%,extracted_text.ilike.%${query}%,category.ilike.%${query}%,search_text.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error searching attachments:", error)
      return NextResponse.json(
        { error: "Failed to search attachments" },
        { status: 500 }
      )
    }

    return NextResponse.json({ attachments: attachments || [], semantic: false })
  } catch (error) {
    console.error("Error searching attachments:", error)
    return NextResponse.json(
      { error: "Failed to search attachments" },
      { status: 500 }
    )
  }
}
