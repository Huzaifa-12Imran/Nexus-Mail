import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/snoozed - Get all snoozed emails for user
export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      var userId = session.user.id
    } else {
      var userId = user.id
    }

    const now = new Date()

    // Get all snoozed emails that haven't been released yet
    const snoozedEmails = await prisma.snoozedEmail.findMany({
      where: {
        userId,
        snoozeUntil: {
          gt: now,
        },
      },
      include: {
        email: {
          select: {
            from: true,
            fromEmail: true,
            subject: true,
            snippet: true,
          },
        },
      },
      orderBy: {
        snoozeUntil: 'asc',
      },
    })

    return NextResponse.json({ snoozedEmails })
  } catch (error) {
    console.error('Error fetching snoozed emails:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snoozed emails' },
      { status: 500 }
    )
  }
}
