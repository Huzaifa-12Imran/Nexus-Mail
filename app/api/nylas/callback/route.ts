import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connect?error=${encodeURIComponent(error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connect?error=missing_params`
      )
    }

    // Decode state to get email
    let email: string
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      email = stateData.email
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connect?error=invalid_state`
      )
    }

    // Exchange code for token
    const tokenResponse = await nylasClient.exchangeCode(code)

    // Get the Supabase user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?redirect=/connect`
      )
    }

    // Update the pending connection
    const connection = await prisma.emailConnection.findFirst({
      where: {
        userId: user.id,
        emailAddress: email,
      },
    })

    if (connection) {
      await prisma.emailConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          grantId: tokenResponse.grant_id,
          expiresAt: tokenResponse.expires_in 
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
          isActive: true,
        },
      })
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connect?success=true`
    )
  } catch (error: any) {
    console.error("Nylas callback error:", error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/connect?error=${encodeURIComponent(error.message)}`
    )
  }
}
