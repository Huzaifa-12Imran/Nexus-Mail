import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { generateReplySuggestion } from "@/lib/openai"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { tone = "professional" } = body

    const email = await prisma.email.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    // Generate reply suggestion using AI
    const suggestion = await generateReplySuggestion(
      email.subject,
      email.body,
      tone
    )

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error("Error generating reply:", error)
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    )
  }
}
