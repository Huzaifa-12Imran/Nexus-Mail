import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/reminders - Get all reminders for user
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

    const { searchParams } = new URL(request.url)
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    const whereClause: Record<string, unknown> = {
      userId,
      isCompleted: false
    }

    if (includeCompleted) {
      delete whereClause.isCompleted
    }

    const reminders = await prisma.emailReminder.findMany({
      where: whereClause,
      orderBy: { remindAt: 'asc' }
    })

    return NextResponse.json({ reminders })
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    )
  }
}

// POST /api/reminders - Create a new reminder
export async function POST(request: Request) {
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

    const body = await request.json()
    const { emailId, title, message, remindAt } = body

    if (!title || !remindAt) {
      return NextResponse.json(
        { error: 'title and remindAt are required' },
        { status: 400 }
      )
    }

    const remindAtDate = new Date(remindAt)
    if (isNaN(remindAtDate.getTime())) {
      return NextResponse.json({ error: 'Invalid remindAt date' }, { status: 400 })
    }

    const reminder = await prisma.emailReminder.create({
      data: {
        userId,
        emailId: emailId || null,
        title,
        message: message || null,
        remindAt: remindAtDate
      }
    })

    return NextResponse.json({ success: true, reminder })
  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    )
  }
}

// PATCH /api/reminders - Update reminder (mark complete)
export async function PATCH(request: Request) {
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

    const body = await request.json()
    const { id, isCompleted } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const reminder = await prisma.emailReminder.updateMany({
      where: {
        id,
        userId
      },
      data: {
        isCompleted: isCompleted ?? true,
        completedAt: isCompleted ? new Date() : null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    )
  }
}

// DELETE /api/reminders - Delete a reminder
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await prisma.emailReminder.deleteMany({
      where: {
        id,
        userId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    )
  }
}
