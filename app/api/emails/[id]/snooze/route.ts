import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// POST /api/emails/[id]/snooze - Snooze an email
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { snoozeUntil, folder = 'inbox' } = await req.json()

    if (!snoozeUntil) {
      return NextResponse.json({ error: 'snoozeUntil is required' }, { status: 400 })
    }

    const snoozeDate = new Date(snoozeUntil)
    if (isNaN(snoozeDate.getTime())) {
      return NextResponse.json({ error: 'Invalid snoozeUntil date' }, { status: 400 })
    }

    // Check if email exists
    const email = await prisma.email.findUnique({
      where: { id: params.id }
    })

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    // Create or update snoozed email entry
    const existingSnooze = await prisma.snoozedEmail.findFirst({
      where: { emailId: params.id }
    })

    let snoozedEmail
    if (existingSnooze) {
      snoozedEmail = await prisma.snoozedEmail.update({
        where: { id: existingSnooze.id },
        data: {
          snoozeUntil: snoozeDate,
          folder
        }
      })
    } else {
      snoozedEmail = await prisma.snoozedEmail.create({
        data: {
          userId,
          emailId: params.id,
          snoozeUntil: snoozeDate,
          folder
        }
      })
    }

    return NextResponse.json({ success: true, snoozedEmail })
  } catch (error) {
    console.error('Error snoozing email:', error)
    return NextResponse.json(
      { error: 'Failed to snooze email' },
      { status: 500 }
    )
  }
}

// DELETE /api/emails/[id]/snooze - Remove snooze from an email
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Remove snoozed email entry
    await prisma.snoozedEmail.deleteMany({
      where: { 
        emailId: params.id,
        userId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing snooze:', error)
    return NextResponse.json(
      { error: 'Failed to remove snooze' },
      { status: 500 }
    )
  }
}
