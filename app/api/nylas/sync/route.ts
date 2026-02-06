import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { nylasClient } from "@/lib/nylas"

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    // Fetch all grants from Nylas
    const grants = await nylasClient.listGrants()
    
    console.log('[Nylas Sync] Found', grants.length, 'grants')
    
    const syncedConnections = []
    
    for (const grant of grants) {
      // Check if connection already exists
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
        const updated = await prisma.emailConnection.update({
          where: { id: existing.id },
          data: {
            emailAddress: grant.email,
            provider: grant.provider,
            isActive: grant.grant_status === 'valid',
            updatedAt: new Date(),
          },
        })
        syncedConnections.push(updated)
      } else {
        // Create new connection
        const created = await prisma.emailConnection.create({
          data: {
            id: grant.id,
            userId,
            emailAddress: grant.email,
            provider: grant.provider,
            accessToken: '',
            isActive: grant.grant_status === 'valid',
          },
        })
        syncedConnections.push(created)
      }
      
      console.log('[Nylas Sync] Synced:', grant.email)
    }

    return NextResponse.json({ 
      message: 'Sync completed',
      connections: syncedConnections,
      count: syncedConnections.length,
    })
  } catch (error: any) {
    console.error('Error syncing Nylas grants:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync Nylas grants' },
      { status: 500 }
    )
  }
}
