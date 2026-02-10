import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"
import { sendEmail as sendResendEmail } from "@/lib/resend"
import { generateEmbedding, summarizeEmail, categorizeEmail } from "@/lib/openai"
import { upsertEmailVector } from "@/lib/pinecone"
import { trackRelationship } from "@/lib/relationships"

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
      // Primary shows only emails from priority senders
      if (category === "primary") {
        // Get priority sender emails
        const prioritySenders = await prisma.prioritySender.findMany({
          where: { userId },
          select: { email: true },
        })
        const priorityEmails = prioritySenders.map(ps => ps.email)
        
        if (priorityEmails.length > 0) {
          // Filter by priority sender emails
          whereClause.fromEmail = { in: priorityEmails }
        } else {
          // No priority senders set, show empty
          whereClause.id = "none"
        }
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

    // Check if multipart/form-data (has files) or JSON
    const contentType = request.headers.get("content-type") || ""
    let body
    let attachments: File[] = []
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      body = {
        to: formData.get("to") as string,
        cc: formData.get("cc") as string,
        bcc: formData.get("bcc") as string,
        subject: formData.get("subject") as string,
        body: formData.get("body") as string,
        threadId: formData.get("threadId") as string,
        connectionId: formData.get("connectionId") as string,
      }
      
      // Get all files
      const fileKeys: string[] = []
      formData.forEach((value, key) => {
        if (value instanceof File && !fileKeys.includes(key)) {
          fileKeys.push(key)
        }
      })
      
      for (const key of fileKeys) {
        const file = formData.get(key) as File
        if (file instanceof File) {
          attachments.push(file)
        }
      }
    } else {
      body = await request.json()
    }

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
    
    // Handle attachments - prepare for sending
    let resendAttachments: Array<{ filename: string; content: string }> = []
    const attachmentIds: string[] = []
    
    if (attachments.length > 0) {
      for (const file of attachments) {
        try {
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const base64Content = buffer.toString('base64')
          
          resendAttachments.push({
            filename: file.name,
            content: base64Content,
          })
          
          // Generate unique ID for this attachment
          const attachmentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          attachmentIds.push(attachmentId)
          
          // Save attachment metadata to Supabase for gallery
          const { error: supabaseError } = await supabase
            .from("attachments")
            .insert({
              id: attachmentId,
              user_id: user.id,
              email_id: undefined, // Will be linked after email is created
              filename: file.name,
              original_name: file.name,
              file_type: file.name.split(".").pop()?.toLowerCase() || "",
              file_size: file.size,
              mime_type: file.type,
              storage_url: `/storage/attachments/${user.id}/${Date.now()}-${file.name}`,
              extracted_text: `[File: ${file.name}]`,
              category: getCategory(file.name, file.type),
              tags: JSON.stringify([]),
              similar_to: JSON.stringify([]),
              is_duplicate: false,
              search_text: `${file.name} ${getCategory(file.name, file.type)}`,
            })
          
          if (supabaseError) {
            console.error('Error saving attachment to Supabase:', supabaseError)
          }
        } catch (error) {
          console.error('Error processing attachment:', error)
        }
      }
    }
    
    // Send email - use Resend for emails with attachments
    let result: any
    
    if (resendAttachments.length > 0 && process.env.RESEND_API_KEY) {
      // Use Resend for emails with attachments
      result = await sendResendEmail({
        to: Array.isArray(to) ? to : [to],
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        subject,
        html: emailBody.replace(/\n/g, '<br>'),
        text: emailBody,
        attachments: resendAttachments,
      })
    } else {
      // Use Nylas for emails without attachments
      result = await nylasClient.sendEmail(grantId, {
        from: { email: connection.emailAddress },
        to: Array.isArray(to) ? to.map((e: string) => ({ email: e })) : [{ email: to }],
        cc: cc ? (Array.isArray(cc) ? cc.map((e: string) => ({ email: e })) : [{ email: cc }]) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.map((e: string) => ({ email: e })) : [{ email: bcc }]) : undefined,
        subject,
        body: emailBody,
      })
    }

    // Store sent email in database
    const sentEmail = await prisma.email.create({
      data: {
        userId: user.id,
        connectionId: connection.id,
        messageId: result?.id || `sent_${Date.now()}`,
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

    // Link attachments to the sent email in Supabase
    if (attachmentIds.length > 0 && sentEmail.id) {
      for (const attachmentId of attachmentIds) {
        await supabase
          .from("attachments")
          .update({ email_id: sentEmail.id })
          .eq("id", attachmentId)
      }
    }

    // Update relationship health tracking (direct call)
    try {
      const recipients = Array.isArray(to) ? to : to
      const recipientList = Array.isArray(recipients) ? recipients.join(", ") : recipients
      
      await trackRelationship({
        emailId: sentEmail.id,
        from: connection.emailAddress,
        to: recipientList,
        subject,
        body: emailBody,
        direction: 'outbound',
        sentAt: new Date().toISOString(),
      }, user.id)
      console.log('Relationship tracking completed')
    } catch (relError) {
      console.error('Relationship tracking error:', relError)
    }

    return NextResponse.json({ success: true, email: sentEmail })
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    )
  }
}

// Helper function to get category
function getCategory(filename: string, mimeType: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "Image"
  if (["pdf"].includes(ext)) return "Document"
  if (["doc", "docx", "txt"].includes(ext)) return "Document"
  if (["zip", "rar", "7z"].includes(ext)) return "Archive"
  
  if (mimeType.includes("image")) return "Image"
  if (mimeType.includes("pdf")) return "Document"
  
  return "Other"
}
