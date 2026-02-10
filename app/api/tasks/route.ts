// Tasks API - Create and manage tasks from emails
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// Helper function to parse deadline strings
function parseDeadline(dateStr?: string): Date | null {
  if (!dateStr) return null
  
  const now = new Date()
  const lowerDate = dateStr.toLowerCase()
  
  // Handle relative dates
  if (lowerDate === 'today') {
    const result = new Date()
    result.setHours(23, 59, 59, 999)
    return result
  }
  
  if (lowerDate === 'tomorrow') {
    const result = new Date()
    result.setDate(result.getDate() + 1)
    result.setHours(23, 59, 59, 999)
    return result
  }
  
  // Handle day of week
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayIndex = daysOfWeek.findIndex(d => lowerDate.includes(d))
  if (dayIndex >= 0) {
    const result = new Date()
    const currentDay = result.getDay()
    let daysUntil = dayIndex - currentDay
    if (daysUntil <= 0) daysUntil += 7
    result.setDate(result.getDate() + daysUntil)
    result.setHours(23, 59, 59, 999)
    return result
  }
  
  // Try to parse as ISO date
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    parsed.setHours(23, 59, 59, 999)
    return parsed
  }
  
  return null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { 
      emailId,
      title, 
      description, 
      priority,
      deadline,
      status = 'pending'
    } = await req.json()

    if (!title) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 })
    }

    // Parse deadline
    const parsedDeadline = parseDeadline(deadline)

    // Create the task in database
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title,
        description,
        priority: priority || 'medium',
        status,
        dueDate: parsedDeadline,
        relatedEmailId: emailId,
      },
    })

    return NextResponse.json({
      success: true,
      task,
    })
  } catch (error: any) {
    console.error("Create task error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create task" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
      ? [searchParams.get("status")]
      : undefined

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        ...(status ? { status: { in: status as string[] } } : {}),
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    })

    return NextResponse.json({
      success: true,
      tasks,
    })
  } catch (error: any) {
    console.error("Get tasks error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId, status, title, description, priority } = await req.json()

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    // Verify task belongs to user
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const updateData: any = {}
    if (status) {
      updateData.status = status
      if (status === 'completed') {
        updateData.completedAt = new Date()
      }
    }
    if (title) updateData.title = title
    if (description) updateData.description = description
    if (priority) updateData.priority = priority

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      task,
    })
  } catch (error: any) {
    console.error("Update task error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update task" },
      { status: 500 }
    )
  }
}
