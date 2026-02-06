import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { summarizeEmail } from "@/lib/openai"

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

    const email = await prisma.email.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    // If email already has a summary, return it
    if (email.summary) {
      return NextResponse.json({ summary: email.summary, cached: true })
    }

    // Generate summary using AI
    const summary = await summarizeEmail(email.subject, email.body)

    // Update email with summary
    await prisma.email.update({
      where: { id: params.id },
      data: { summary },
    })

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Error generating summary:", error)
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    )
  }
}
