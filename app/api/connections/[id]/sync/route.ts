import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"
import { generateEmbedding, summarizeEmail, categorizeEmail } from "@/lib/openai"
import { upsertEmailVector } from "@/lib/pinecone"

// Helper function to parse Nylas date (handles both Unix timestamp and ISO string)
function parseNylasDate(dateValue: number | string | undefined | null): Date {
  if (!dateValue) return new Date()
  
  if (typeof dateValue === 'number') {
    // Unix timestamp in seconds (Nylas standard)
    return new Date(dateValue * 1000)
  } else if (typeof dateValue === 'string') {
    // ISO string
    const parsed = new Date(dateValue)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }
  
  return new Date()
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const connection = await prisma.emailConnection.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Check if connection is active and has access token
    if (!connection.isActive || !connection.grantId) {
      return NextResponse.json(
        { error: "Email connection not fully authenticated. Please reconnect your account." },
        { status: 400 }
      )
    }

    // Fetch emails from Nylas using grantId
    const grantId = connection.grantId
    const emailsResponse = await nylasClient.getEmails(grantId, 50, 0)
    const nylasEmails = emailsResponse.data

    // Get default categories
    const categories = await prisma.category.findMany({
      where: { userId: user.id, isDefault: true },
    })

    const defaultCategories: string[] = categories.length > 0
      ? categories.map((c: any) => c.name)
      : ["Primary", "Social", "Promotions", "Updates", "Forums"]

    let syncedCount = 0

    for (const nylasEmail of nylasEmails) {
      // Check if email already exists (use Nylas message ID)
      const existing = await prisma.email.findFirst({
        where: { messageId: nylasEmail.id },
      })

      if (existing) continue

      // AI processing
      const textContent = `${nylasEmail.subject}\n\n${nylasEmail.body}`
      let embedding: number[] | undefined
      let summary: string | undefined
      let categoryId: string | undefined

      try {
        embedding = await generateEmbedding(textContent)
        summary = await summarizeEmail(nylasEmail.subject, nylasEmail.body)
        
        const categoryName = await categorizeEmail(
          nylasEmail.subject,
          nylasEmail.body,
          defaultCategories
        )

        const category = await prisma.category.findFirst({
          where: { userId: user.id, name: categoryName },
        })

        if (category) {
          categoryId = category.id
        } else if (categories.length > 0) {
          categoryId = categories[0].id
        }
      } catch (aiError) {
        console.error("AI processing error:", aiError)
      }

      // Store email in database
      const email = await prisma.email.create({
        data: {
          userId: user.id,
          connectionId: connection.id,
          messageId: nylasEmail.id,
          from: nylasEmail.from[0]?.name || nylasEmail.from[0]?.email || "Unknown",
          fromEmail: nylasEmail.from[0]?.email || "",
          to: nylasEmail.to.map((t) => t.email).join(", "),
          cc: nylasEmail.cc?.map((c) => c.email).join(", ") || null,
          bcc: nylasEmail.bcc?.map((b) => b.email).join(", ") || null,
          subject: nylasEmail.subject,
          body: nylasEmail.body,
          snippet: nylasEmail.snippet || null,
          summary,
          categoryId,
          isRead: nylasEmail.unread,
          isStarred: nylasEmail.starred,
          receivedAt: parseNylasDate(nylasEmail.received_at),
        },
      })

      // Store vector embedding in Pinecone
      if (embedding) {
        try {
          await upsertEmailVector(email.id, embedding, {
            userId: user.id,
            subject: nylasEmail.subject,
            body: nylasEmail.body,
            from: nylasEmail.from[0]?.email || "",
            receivedAt: parseNylasDate(nylasEmail.received_at).toISOString(),
          })
        } catch (vectorError) {
          console.error("Vector storage error:", vectorError)
        }
      }

      syncedCount++
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      message: `Synced ${syncedCount} new emails`,
    })
  } catch (error: any) {
    console.error("Error syncing emails:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync emails" },
      { status: 500 }
    )
  }
}
