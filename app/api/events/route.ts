// Calendar Events API - Create and manage calendar events
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// Helper function to parse date strings
function parseDate(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr) return null
  
  const now = new Date()
  const lowerDate = dateStr.toLowerCase()
  
  // Handle relative dates
  if (lowerDate === 'today') {
    const result = new Date()
    result.setHours(0, 0, 0, 0)
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number)
      result.setHours(hours, minutes, 0, 0)
    }
    return result
  }
  
  if (lowerDate === 'tomorrow') {
    const result = new Date()
    result.setDate(result.getDate() + 1)
    result.setHours(0, 0, 0, 0)
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number)
      result.setHours(hours, minutes, 0, 0)
    }
    return result
  }
  
  // Try to parse as ISO date
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number)
      parsed.setHours(hours, minutes, 0, 0)
    }
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
      location, 
      startTime, 
      endTime, 
      isAllDay,
      attendees,
      date,
      time 
    } = await req.json()

    if (!title) {
      return NextResponse.json({ error: "Event title is required" }, { status: 400 })
    }

    // Parse start time from various formats
    let parsedStartTime: Date | null = null
    let parsedEndTime: Date | null = null

    if (startTime) {
      parsedStartTime = new Date(startTime)
      // Default end time to 1 hour after start
      parsedEndTime = endTime ? new Date(endTime) : new Date(parsedStartTime.getTime() + 60 * 60 * 1000)
    } else if (date) {
      // Parse from date/time fields
      parsedStartTime = parseDate(date, time)
      if (parsedStartTime) {
        parsedEndTime = new Date(parsedStartTime.getTime() + 60 * 60 * 1000) // Default 1 hour
      }
    }

    // Default to now if no time specified
    if (!parsedStartTime) {
      parsedStartTime = new Date()
      parsedEndTime = new Date(parsedStartTime.getTime() + 60 * 60 * 1000)
    }

    // Create the event in database
    const event = await prisma.event.create({
      data: {
        userId: user.id,
        title,
        description,
        location,
        startTime: parsedStartTime,
        endTime: parsedEndTime || parsedStartTime,
        isAllDay: isAllDay || false,
        status: 'confirmed',
        availability: 'busy',
      },
    })

    // Create attendees if provided
    if (attendees && Array.isArray(attendees) && attendees.length > 0) {
      await prisma.eventAttendee.createMany({
        data: attendees.map((email: string) => ({
          eventId: event.id,
          email,
          status: 'pending',
        })),
      })
    }

    // Link to email if provided
    if (emailId) {
      await prisma.email.update({
        where: { id: emailId },
        data: {},
      })
    }

    const createdEvent = await prisma.event.findUnique({
      where: { id: event.id },
      include: { attendees: true },
    })

    return NextResponse.json({
      success: true,
      event: createdEvent,
    })
  } catch (error: any) {
    console.error("Create event error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create event" },
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
    const upcoming = searchParams.get("upcoming") === "true"

    const whereClause: any = {
      userId: user.id,
      deletedAt: null,
    }

    if (upcoming) {
      whereClause.startTime = { gte: new Date() }
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: { attendees: true },
      orderBy: { startTime: 'asc' },
      take: 50,
    })

    return NextResponse.json({
      success: true,
      events,
    })
  } catch (error: any) {
    console.error("Get events error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    )
  }
}
