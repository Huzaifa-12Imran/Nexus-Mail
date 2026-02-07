import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"
import { generateEmbedding, summarizeEmail, categorizeEmail } from "@/lib/openai"
import { upsertEmailVector } from "@/lib/pinecone"

// Timeout for AI operations (10 seconds)
const AI_TIMEOUT_MS = 10000

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

// Helper function to run AI operations with timeout
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<T | null>((resolve) => 
      setTimeout(() => {
        console.log(`[Sync] AI operation timed out after ${ms}ms`)
        resolve(null)
      }, ms)
    )
  ])
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  console.log('[Sync] Starting email sync...')

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

    // Check if connection is active
    const grantId = connection.grantId || connection.id
    
    if (!connection.isActive) {
      return NextResponse.json(
        { error: "Email connection is not active. Please reconnect your account." },
        { status: 400 }
      )
    }

    // Fetch emails from Nylas (limit to 20 for faster sync)
    console.log('[Sync] Fetching emails from Nylas...')
    const emailsResponse = await nylasClient.getEmails(grantId, 20, 0)
    const nylasEmails = emailsResponse.data
    console.log(`[Sync] Found ${nylasEmails.length} emails to sync`)

    // Get default categories
    const categories = await prisma.category.findMany({
      where: { userId: user.id, isDefault: true },
    })

    const defaultCategories: string[] = categories.length > 0
      ? categories.map((c: any) => c.name)
      : ["Primary", "Social", "Promotions", "Updates", "Forums"]

    let syncedCount = 0
    let skippedAI = 0

    for (const nylasEmail of nylasEmails) {
      let embedding: number[] | null = null
      let summary: string | undefined
      let categoryId: string | undefined

      // Try AI features with timeout
      const textContent = `${nylasEmail.subject}\n\n${nylasEmail.body}`

      try {
        // Run embedding and categorization in parallel with timeout
        const [embeddingResult, summaryResult, categoryName] = await Promise.all([
          withTimeout(generateEmbedding(textContent), AI_TIMEOUT_MS),
          withTimeout(summarizeEmail(nylasEmail.subject, nylasEmail.body), AI_TIMEOUT_MS),
          withTimeout(categorizeEmail(nylasEmail.subject, nylasEmail.body, defaultCategories), AI_TIMEOUT_MS),
        ])

        if (embeddingResult) {
          embedding = embeddingResult
        } else {
          skippedAI++
        }
        
        summary = summaryResult || undefined

        const category = await prisma.category.findFirst({
          where: { userId: user.id, name: categoryName || "Primary" },
        })

        if (category) {
          categoryId = category.id
        } else if (categories.length > 0) {
          categoryId = categories[0].id
        }
      } catch (aiError: any) {
        console.log(`[Sync] AI processing skipped for email ${nylasEmail.id}:`, aiError?.message || 'Unknown error')
        skippedAI++
      }

      // Store email in database
      const email = await prisma.email.upsert({
        where: { messageId: nylasEmail.id },
        create: {
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
        update: {
          isRead: nylasEmail.unread,
          isStarred: nylasEmail.starred,
          updatedAt: new Date(),
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
          console.error("[Sync] Vector storage error:", vectorError)
        }
      }

      syncedCount++
    }

    const elapsed = Date.now() - startTime
    console.log(`[Sync] Completed in ${elapsed}ms - synced ${syncedCount} emails (AI skipped: ${skippedAI})`)

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      message: `Synced ${syncedCount} emails in ${Math.round(elapsed/1000)}s`,
    })
  } catch (error: any) {
    console.error("[Sync] Error syncing emails:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sync emails" },
      { status: 500 }
    )
  }
}
