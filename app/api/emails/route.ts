import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"
import { generateEmbedding, summarizeEmail, categorizeEmail } from "@/lib/openai"
import { upsertEmailVector } from "@/lib/pinecone"

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // Fallback to getSession
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
    const folder = searchParams.get("folder")
    const unread = searchParams.get("unread")
    const search = searchParams.get("search")
    const connectionId = searchParams.get("connectionId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // If search query exists, perform semantic search using Pinecone
    if (search) {
      // Generate embedding for search query
      const queryEmbedding = await generateEmbedding(search)
      
      // Search Pinecone for similar emails
      const { searchSimilarEmails } = await import("@/lib/pinecone")
      const similarEmails = await searchSimilarEmails(queryEmbedding, userId, limit)

      // Return matching emails
      const emailIds = similarEmails.map(match => match.id)
      const emails = await prisma.email.findMany({
        where: {
          id: { in: emailIds },
          userId,
          isDeleted: false,
        },
        include: {
          category: true,
        },
        orderBy: { receivedAt: "desc" },
      })

      return NextResponse.json({ emails, total: emails.length })
    }

    // Regular email listing with folder or category filter
    const whereClause: Record<string, unknown> = {
      userId,
      isDeleted: false,
    }

    // Filter by connection if provided
    if (connectionId) {
      whereClause.connectionId = connectionId
    }

    // Handle folder filters
    if (folder) {
      switch (folder) {
        case "starred":
          whereClause.isStarred = true
          break
        case "sent":
          whereClause.isSent = true
          break
        case "drafts":
          whereClause.isDraft = true
          break
        case "spam":
          whereClause.isSpam = true
          break
        case "trash":
          whereClause.isDeleted = true
          break
      }
    }

    // Handle category filter
    if (category && category !== "all") {
      // Primary shows uncategorized emails too (default)
      if (category === "primary") {
        whereClause.OR = [
          { category: { name: "Primary" } },
          { category: null },
        ]
      } else {
        // Other categories only show matched category
        whereClause.category = { name: category }
      }
    }

    // Handle unread filter
    if (unread === "true") {
      whereClause.isRead = false
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: whereClause,
        include: {
          category: true,
        },
        orderBy: { receivedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.email.count({ where: whereClause }),
    ])

    return NextResponse.json({ emails, total })
  } catch (error) {
    console.error("Error fetching emails:", error)
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { to, cc, bcc, subject, body: emailBody, threadId, connectionId } = body

    // Get user's email connection (use selected connection or first active)
    const connection = connectionId
      ? await prisma.emailConnection.findFirst({
          where: { id: connectionId, userId: user.id },
        })
      : await prisma.emailConnection.findFirst({
          where: { userId: user.id, isActive: true },
        })

    if (!connection) {
      return NextResponse.json(
        { error: "No email connection found" },
        { status: 400 }
      )
    }

    // For Nylas v3, the connection.id IS the grantId
    const grantId = connection.grantId || connection.id
    
    const result = await nylasClient.sendEmail(grantId, {
      from: { email: connection.emailAddress },
      to: Array.isArray(to) ? to.map((e: string) => ({ email: e })) : [{ email: to }],
      cc: cc ? (Array.isArray(cc) ? cc.map((e: string) => ({ email: e })) : [{ email: cc }]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.map((e: string) => ({ email: e })) : [{ email: bcc }]) : undefined,
      subject,
      body: emailBody,
    })

    // Store sent email in database
    const sentEmail = await prisma.email.create({
      data: {
        userId: user.id,
        connectionId: connection.id,
        messageId: result.id || `sent_${Date.now()}`,
        threadId: threadId || null,
        from: connection.emailAddress,
        fromEmail: connection.emailAddress,
        to: Array.isArray(to) ? to.join(", ") : to,
        cc: cc || null,
        bcc: bcc || null,
        subject,
        body: emailBody,
        isSent: true,
        isRead: true,
        sentAt: new Date(),
        receivedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, email: sentEmail })
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    )
  }
}
