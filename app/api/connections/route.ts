import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"

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
