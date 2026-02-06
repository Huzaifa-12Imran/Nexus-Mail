import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const grantId = searchParams.get("grant_id")
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connect?error=${encodeURIComponent(error)}`
      )
    }

    if (!grantId && !code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connect?error=missing_params`
      )
    }

    // Decode state to get email
    let email: string
    try {
      const stateData = JSON.parse(Buffer.from(state!, 'base64').toString())
      email = stateData.email
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/connect?error=invalid_state`
      )
    }

    // Get the Supabase user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?redirect=/connect`
      )
    }

    // Handle v3 ECC (grant_id) or v2 OAuth (code)
    let accessToken: string | undefined
    let refreshToken: string | undefined
    let expiresIn: number | undefined
    let accountGrantId: string | undefined

    if (grantId) {
      // v3 ECC - grant_id is provided directly
      accountGrantId = grantId
    } else if (code) {
      // v2 OAuth - exchange code for token
      const tokenResponse = await nylasClient.exchangeCode(code)
      accessToken = tokenResponse.access_token
      refreshToken = tokenResponse.refresh_token
      expiresIn = tokenResponse.expires_in
      accountGrantId = tokenResponse.grant_id
    }

    // Find or create the connection
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
          accessToken: accessToken || "",
          refreshToken: refreshToken || null,
          grantId: accountGrantId || null,
          expiresAt: expiresIn 
            ? new Date(Date.now() + expiresIn * 1000)
            : null,
          isActive: true,
        },
      })
    } else {
      await prisma.emailConnection.create({
        data: {
          userId: user.id,
          emailAddress: email,
          provider: 'gmail',
          accessToken: accessToken || "",
          refreshToken: refreshToken || null,
          grantId: accountGrantId || null,
          expiresAt: expiresIn 
            ? new Date(Date.now() + expiresIn * 1000)
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
