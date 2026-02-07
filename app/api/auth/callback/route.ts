import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // Create or update user in database
        await prisma.user.upsert({
          where: { id: session.user.id },
          update: {
            email: session.user.email!,
            name: session.user.user_metadata.full_name,
            avatarUrl: session.user.user_metadata.avatar_url,
          },
          create: {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.full_name,
            avatarUrl: session.user.user_metadata.avatar_url,
          },
        })

        // Create default categories
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
              ...category,
            },
          })
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
