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

    const email = await prisma.email.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        category: true,
        labels: true,
      },
    })

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    return NextResponse.json({ email })
  } catch (error) {
    console.error("Error fetching email:", error)
    return NextResponse.json(
      { error: "Failed to fetch email" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { isRead, isStarred, isArchived, isDeleted, categoryId } = body

    const email = await prisma.email.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    const updatedEmail = await prisma.email.update({
      where: { id: params.id },
      data: {
        isRead,
        isStarred,
        isArchived,
        isDeleted,
        categoryId,
      },
    })

    return NextResponse.json({ email: updatedEmail })
  } catch (error) {
    console.error("Error updating email:", error)
    return NextResponse.json(
      { error: "Failed to update email" },
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

    const email = await prisma.email.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    // Soft delete
    await prisma.email.update({
      where: { id: params.id },
      data: { isDeleted: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting email:", error)
    return NextResponse.json(
      { error: "Failed to delete email" },
      { status: 500 }
    )
  }
}
