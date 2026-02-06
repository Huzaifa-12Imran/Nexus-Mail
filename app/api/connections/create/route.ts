import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized - Please login first" }, { status: 401 })
    }

    const body = await request.json()
    const { email, provider } = body

    if (!email || !provider) {
      return NextResponse.json(
        { error: "Email and provider are required" },
        { status: 400 }
      )
    }

    // Create user if doesn't exist (sync with Supabase Auth)
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser) {
      // Create user from Supabase Auth data
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email || email,
          name: user.user_metadata?.full_name || null,
          avatarUrl: user.user_metadata?.avatar_url || null,
        },
      })
    }

    // Check if connection already exists
    const existing = await prisma.emailConnection.findFirst({
      where: {
        userId: user.id,
        emailAddress: email,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "This email is already connected" },
        { status: 400 }
      )
    }

    // Create connection with Nylas
    const result = await nylasClient.createConnectUrl(email, provider)

    // Create pending connection in database
    await prisma.emailConnection.create({
      data: {
        userId: user.id,
        emailAddress: email,
        provider,
        accessToken: "", // Will be set after OAuth callback
        isActive: false,
      },
    })

    return NextResponse.json({ authUrl: result.url, state: result.state })
  } catch (error: any) {
    console.error("Error creating connection:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create connection" },
      { status: 500 }
    )
  }
}
