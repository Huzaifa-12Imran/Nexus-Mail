import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"
import { categorizeEmail } from "@/lib/openai"

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

    // Fetch emails from Nylas (limit to 50 for faster sync)
    console.log('[Sync] Fetching emails from Nylas...')
    const emailsResponse = await nylasClient.getEmails(grantId, 50, 0)
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

    for (const nylasEmail of nylasEmails) {
      let categoryId: string | undefined

      // Use rule-based categorization only (no AI for speed)
      try {
        const categoryName = await categorizeEmail(
          nylasEmail.subject,
          nylasEmail.body,
          defaultCategories
        )

        const category = await prisma.category.findFirst({
          where: { userId: user.id, name: categoryName || "Primary" },
        })

        if (category) {
          categoryId = category.id
        } else if (categories.length > 0) {
          categoryId = categories[0].id
        }
      } catch (catError) {
        console.warn(`[Sync] Categorization error for ${nylasEmail.id}:`, catError)
      }

      // Store email in database
      await prisma.email.upsert({
        where: { messageId: nylasEmail.id },
        create: {
          userId: user.id,
          connectionId: connection.id,
          messageId: nylasEmail.id,
          from: nylasEmail.from[0]?.name || nylasEmail.from[0]?.email || "Unknown",
          fromEmail: nylasEmail.from[0]?.email || "",
          to: nylasEmail.to.map((t: any) => t.email).join(", "),
          cc: nylasEmail.cc?.map((c: any) => c.email).join(", ") || null,
          bcc: nylasEmail.bcc?.map((b: any) => b.email).join(", ") || null,
          subject: nylasEmail.subject,
          body: nylasEmail.body,
          snippet: nylasEmail.snippet || null,
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

      syncedCount++
    }

    const elapsed = Date.now() - startTime
    console.log(`[Sync] Completed in ${elapsed}ms - synced ${syncedCount} emails (rule-based categorization)`)

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
