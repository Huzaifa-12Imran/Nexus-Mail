// Extraction API using OpenRouter for AI-powered data extraction from emails
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1"
const EXTRACTION_MODEL = "openai/gpt-4o-mini"

// Local cleanText function (mirrors lib/openai.ts)
function cleanText(input: string): string {
  if (!input) return ""
  
  let text = input
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(link|meta)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s*(style|class)\s*=\s*["'][^"']*["']/gi, " ")
    .replace(/([.#][a-zA-Z0-9_-]+)\s*\{[^}]*\}/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/url\([^)]+\)/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  
  return text
}

interface ExtractedEvent {
  title: string
  description?: string
  date?: string
  time?: string
  location?: string
  attendees?: string[]
  isAllDay?: boolean
}

interface ExtractedTask {
  taskName: string
  deadline?: string
  priority?: "low" | "medium" | "high" | "urgent"
}

interface ExtractedData {
  events: ExtractedEvent[]
  tasks: ExtractedTask[]
  summary: string
}

async function queryOpenRouter(messages: any[], maxTokens: number = 500): Promise<string> {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 20000)

  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://aimail.app",
      "X-Title": "AiMail",
    },
    body: JSON.stringify({
      model: EXTRACTION_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
    signal: controller.signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content ?? ""
  
  if (!content.trim()) {
    throw new Error("AI returned empty response")
  }
  
  return content
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailId, subject, body } = await req.json()

    if (!emailId && (!subject || !body)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // If emailId provided, fetch the email
    let emailData = { subject, body }
    
    if (emailId) {
      const email = await prisma.email.findUnique({
        where: { id: emailId },
      })

      if (!email) {
        return NextResponse.json({ error: "Email not found" }, { status: 404 })
      }

      emailData = {
        subject: email.subject,
        body: cleanText(email.bodyHtml || email.body),
      }
    }

    const cleanSubject = cleanText(emailData.subject)
    const cleanBody = cleanText(emailData.body)

    const prompt = `You are an AI assistant that extracts structured data from emails. Analyze the following email and extract:

1. CALENDAR EVENTS - Look for meeting requests, appointments, dates, times, locations, and attendees
2. TASKS - Look for action items, to-dos, deadlines, and priorities
3. SUMMARY - A concise summary of the email content

Email Subject: ${cleanSubject}
Email Body: ${cleanBody}

Respond with ONLY a valid JSON object in this format:
{
  "events": [
    {
      "title": "Event title",
      "description": "Event description",
      "date": "YYYY-MM-DD or 'today' or 'tomorrow' or day of week",
      "time": "HH:MM format or time description like '2pm'",
      "location": "Location if mentioned",
      "attendees": ["email1@example.com", "email2@example.com"],
      "isAllDay": true/false
    }
  ],
  "tasks": [
    {
      "taskName": "Task description",
      "deadline": "YYYY-MM-DD or date description",
      "priority": "low/medium/high/urgent"
    }
  ],
  "summary": "Brief summary of the email content"
}

If no events, tasks, or summary can be extracted, return empty arrays and a generic summary.
Only respond with the JSON object, no other text.`

    const extractedData: string = await queryOpenRouter(
      [
        {
          role: "system",
          content: "You are a precise data extraction assistant. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      800
    )

    // Parse the JSON response
    let parsedData: ExtractedData
    try {
      // Clean the response to extract JSON
      const jsonMatch = extractedData.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch (parseError) {
      console.error("Failed to parse extraction response:", extractedData)
      parsedData = {
        events: [],
        tasks: [],
        summary: cleanBody.substring(0, 200) + (cleanBody.length > 200 ? "..." : ""),
      }
    }

    // Ensure required fields
    if (!parsedData.events) parsedData.events = []
    if (!parsedData.tasks) parsedData.tasks = []
    if (!parsedData.summary) parsedData.summary = cleanBody.substring(0, 200) + (cleanBody.length > 200 ? "..." : "")

    return NextResponse.json({
      success: true,
      data: parsedData,
      emailId,
    })
  } catch (error: any) {
    console.error("Extraction error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to extract data" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    description: "Extract calendar events, tasks, and summaries from emails using AI",
    method: "POST",
    body: {
      emailId: "optional - ID of email to extract from",
      subject: "optional - email subject (required if emailId not provided)",
      body: "optional - email body (required if emailId not provided)",
    },
  })
}
