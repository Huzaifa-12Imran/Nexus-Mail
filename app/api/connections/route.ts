import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    // First, sync Nylas grants to database
    try {
      const grants = await nylasClient.listGrants()
      
      for (const grant of grants) {
        // Check if connection already exists for this user with this email
        const existing = await prisma.emailConnection.findFirst({
          where: {
            OR: [
              { id: grant.id },
              { emailAddress: grant.email },
            ],
          },
        })
        
        if (existing) {
          // Update existing connection
          await prisma.emailConnection.update({
            where: { id: existing.id },
            data: {
              emailAddress: grant.email,
              provider: grant.provider,
              isActive: grant.grant_status === 'valid',
              updatedAt: new Date(),
            },
          })
        } else {
          // Create new connection
          await prisma.emailConnection.create({
            data: {
              id: grant.id,
              userId,
              emailAddress: grant.email,
              provider: grant.provider,
              accessToken: '',
              isActive: grant.grant_status === 'valid',
            },
          })
        }
      }
    } catch (syncError) {
      console.error('Error syncing Nylas grants:', syncError)
      // Continue even if sync fails - return existing connections
    }

    // Return connections from database
    const connections = await prisma.emailConnection.findMany({
      where: { userId },
      select: {
        id: true,
        emailAddress: true,
        provider: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ connections })
  } catch (error) {
    console.error("Error fetching connections:", error)
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Connection ID required" }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify connection belongs to user
    const connection = await prisma.emailConnection.findFirst({
      where: { id, userId: user.id },
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Delete the connection
    await prisma.emailConnection.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting connection:", error)
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    )
  }
}
