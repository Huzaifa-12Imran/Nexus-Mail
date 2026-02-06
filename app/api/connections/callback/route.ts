import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { aurinkoClient } from "@/lib/aurinko"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const accountId = searchParams.get("accountId")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error) {
    console.error("Aurinko OAuth error:", error)
    return NextResponse.redirect(`${origin}/connect?error=${encodeURIComponent(error)}`)
  }

  if (!code || !accountId) {
    return NextResponse.redirect(`${origin}/connect?error=missing_params`)
  }

  try {
    // Exchange code for tokens
    const tokens = await aurinkoClient.exchangeCodeForToken(code, accountId)

    // Get account info from Aurinko
    const account = await aurinkoClient.getAccount(accountId)

    // Get or create user session
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.redirect(`${origin}/login`)
    }

    // Update connection with tokens
    await prisma.emailConnection.updateMany({
      where: {
        emailAddress: account.email,
        userId: session.user.id,
      },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        isActive: true,
      },
    })

    // Create default categories if they don't exist
    const defaultCategories = [
      { name: "Primary", color: "#3B82F6", isDefault: true },
      { name: "Social", color: "#10B981", isDefault: true },
      { name: "Promotions", color: "#F59E0B", isDefault: true },
      { name: "Updates", color: "#6366F1", isDefault: true },
      { name: "Forums", color: "#8B5CF6", isDefault: true },
    ]

    for (const category of defaultCategories) {
      await prisma.category.upsert({
        where: {
          id: `${session.user.id}-${category.name}`,
        },
        update: {},
        create: {
          id: `${session.user.id}-${category.name}`,
          userId: session.user.id,
          name: category.name,
          color: category.color,
          isDefault: category.isDefault,
        },
      })
    }

    return NextResponse.redirect(`${origin}/?connected=true`)
  } catch (error) {
    console.error("Callback error:", error)
    return NextResponse.redirect(`${origin}/connect?error=callback_failed`)
  }
}
