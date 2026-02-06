import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const connection = await prisma.emailConnection.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    return NextResponse.json({ connection })
  } catch (error) {
    console.error("Error fetching connection:", error)
    return NextResponse.json(
      { error: "Failed to fetch connection" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const connection = await prisma.emailConnection.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Delete connection and related emails
    await prisma.emailConnection.delete({
      where: { id: params.id },
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
