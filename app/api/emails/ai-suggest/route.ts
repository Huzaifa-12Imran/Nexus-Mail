import { NextResponse } from "next/server"
import { generateReplySuggestion } from "@/lib/openai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { subject, body: emailBody, tone = "professional" } = body

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: "Subject and body are required" },
        { status: 400 }
      )
    }

    const suggestion = await generateReplySuggestion(subject, emailBody, tone)

    return NextResponse.json({ suggestion })
  } catch (error) {
    console.error("Error generating suggestion:", error)
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 }
    )
  }
}
