import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component
            }
          },
        },
      }
    )

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

      // Redirect to home page
      const response = NextResponse.redirect(new URL("/", origin))
      return response
    }
  }

  // Return the user to login page on error
  return NextResponse.redirect(new URL("/login", origin))
}
