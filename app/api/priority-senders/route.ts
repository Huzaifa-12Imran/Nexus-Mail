import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/priority-senders - Get all priority senders for user
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

    const prioritySenders = await prisma.prioritySender.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ prioritySenders })
  } catch (error) {
    console.error('Error fetching priority senders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch priority senders' },
      { status: 500 }
    )
  }
}

// POST /api/priority-senders - Add a new priority sender
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
    const { email, name } = body

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check if already exists
    const existing = await prisma.prioritySender.findFirst({
      where: {
        userId,
        email: email.toLowerCase()
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Email already in priority list' }, { status: 400 })
    }

    const prioritySender = await prisma.prioritySender.create({
      data: {
        userId,
        email: email.toLowerCase(),
        name: name || null
      }
    })

    return NextResponse.json({ success: true, prioritySender })
  } catch (error) {
    console.error('Error creating priority sender:', error)
    return NextResponse.json(
      { error: 'Failed to create priority sender' },
      { status: 500 }
    )
  }
}

// DELETE /api/priority-senders - Remove a priority sender
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
    const email = searchParams.get('email')

    if (!id && !email) {
      return NextResponse.json({ error: 'id or email is required' }, { status: 400 })
    }

    const whereClause: Record<string, unknown> = { userId }

    if (id) {
      whereClause.id = id
    } else if (email) {
      whereClause.email = email.toLowerCase()
    }

    await prisma.prioritySender.deleteMany({
      where: whereClause
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting priority sender:', error)
    return NextResponse.json(
      { error: 'Failed to delete priority sender' },
      { status: 500 }
    )
  }
}
