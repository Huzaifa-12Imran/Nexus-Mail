import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { aurinkoClient } from "@/lib/aurinko"
import { generateEmbedding, summarizeEmail, categorizeEmail } from "@/lib/openai"
import { upsertEmailVector } from "@/lib/pinecone"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    switch (type) {
      case "email.received": {
        await handleIncomingEmail(data)
        break
      }
      case "email.sent": {
        await handleSentEmail(data)
        break
      }
      case "email.updated": {
        await handleEmailUpdated(data)
        break
      }
      case "email.deleted": {
        await handleEmailDeleted(data)
        break
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

async function handleIncomingEmail(data: {
  accountId: string
  messageId: string
  from: { email: string; name?: string }
  to: Array<{ email: string }>
  subject: string
  body: string
  bodyHtml?: string
  snippet?: string
  receivedAt: string
  isRead: boolean
}) {
  // Find the connection
  const connection = await prisma.emailConnection.findFirst({
    where: { id: data.accountId },
  })

  if (!connection) {
    console.error("Connection not found:", data.accountId)
    return
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: connection.userId },
  })

  if (!user) {
    console.error("User not found for connection:", connection.userId)
    return
  }

  // AI processing
  const textContent = `${data.subject}\n\n${data.body}`
  const embedding = await generateEmbedding(textContent)
  const summary = await summarizeEmail(data.subject, data.body)
  
  const categories = ["Primary", "Social", "Promotions", "Updates", "Forums"]
  const categoryName = await categorizeEmail(data.subject, data.body, categories)

  // Get or create category
  let category = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: categoryName,
    },
  })

  if (!category) {
    category = await prisma.category.create({
      data: {
        userId: user.id,
        name: categoryName,
        color: getCategoryColor(categoryName),
      },
    })
  }

  // Store email in database
  const email = await prisma.email.create({
    data: {
      userId: user.id,
      connectionId: connection.id,
      messageId: data.messageId,
      from: data.from.name || data.from.email,
      fromEmail: data.from.email,
      to: data.to.map((t) => t.email).join(", "),
      subject: data.subject,
      body: data.body,
      bodyHtml: data.bodyHtml,
      snippet: data.snippet,
      summary,
      categoryId: category.id,
      isRead: data.isRead,
      receivedAt: new Date(data.receivedAt),
    },
  })

  // Store vector embedding in Pinecone
  await upsertEmailVector(email.id, embedding, {
    userId: user.id,
    subject: data.subject,
    body: data.body,
    from: data.from.email,
    receivedAt: data.receivedAt,
  })

  console.log("Email processed and stored:", email.id)
}

async function handleSentEmail(data: {
  accountId: string
  messageId: string
  to: Array<{ email: string }>
  subject: string
  body: string
  sentAt: string
}) {
  const connection = await prisma.emailConnection.findFirst({
    where: { id: data.accountId },
  })

  if (!connection) return

  await prisma.email.create({
    data: {
      userId: connection.userId,
      connectionId: connection.id,
      messageId: data.messageId,
      from: connection.emailAddress,
      fromEmail: connection.emailAddress,
      to: data.to.map((t) => t.email).join(", "),
      subject: data.subject,
      body: data.body,
      isSent: true,
      isRead: true,
      sentAt: new Date(data.sentAt),
      receivedAt: new Date(data.sentAt),
    },
  })
}

async function handleEmailUpdated(data: { messageId: string; isRead: boolean }) {
  await prisma.email.updateMany({
    where: { messageId: data.messageId },
    data: { isRead: data.isRead },
  })
}

async function handleEmailDeleted(data: { messageId: string }) {
  await prisma.email.updateMany({
    where: { messageId: data.messageId },
    data: { isDeleted: true },
  })
}

function getCategoryColor(categoryName: string): string {
  const colors: Record<string, string> = {
    Primary: "#3B82F6",
    Social: "#10B981",
    Promotions: "#F59E0B",
    Updates: "#6366F1",
    Forums: "#8B5CF6",
  }
  return colors[categoryName] || "#6B7280"
}
