import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { EnergyLevel, calculateEnergyStats, analyzePatterns, generateAISuggestions, getWeeklyRange } from "@/lib/energy-utils"

export async function GET(request: NextRequest) {
  console.log("=== GET /api/energy ===")
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log("Auth result:", { userId: user?.id, error: authError })

    if (authError || !user) {
      console.log("Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "week"
    const includeSuggestions = searchParams.get("suggestions") === "true"

    console.log("Querying energy data for user:", user.id, "period:", period)

    // Get date range
    let startDate: Date
    const endDate = new Date()
    
    switch (period) {
      case "today":
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
      default:
        const weekRange = getWeeklyRange()
        startDate = weekRange.start
        break
      case "month":
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        break
      case "all":
        startDate = new Date(0) // Beginning of time
        break
    }

    // Query Supabase for energy ratings
    let query = supabase
      .from("email_energy_ratings")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false })

    const { data: ratings, error } = await query

    console.log("Query result:", { count: ratings?.length, error })

    if (error) {
      console.error("Error fetching energy ratings:", error)
      return NextResponse.json({ error: "Failed to fetch energy ratings", details: error }, { status: 500 })
    }

    // Calculate stats and patterns
    const stats = calculateEnergyStats(ratings || [])
    const patterns = analyzePatterns(ratings || [])

    let suggestions: any[] = []
    if (includeSuggestions && ratings && ratings.length >= 5) {
      suggestions = await generateAISuggestions(stats, patterns, ratings || [])
    }

    return NextResponse.json({
      ratings: ratings || [],
      stats,
      patterns,
      suggestions,
      period,
    })
  } catch (error) {
    console.error("Error fetching energy data:", error)
    return NextResponse.json({ error: "Failed to fetch energy data" }, { status: 500 })
  }
}

// Submit a new energy rating
export async function POST(request: NextRequest) {
  console.log("=== POST /api/energy ===")
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log("Auth result:", { userId: user?.id, error: authError })

    if (authError || !user) {
      console.log("Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const text = await request.text()
    console.log("Request body:", text)
    
    if (!text || text.trim() === '') {
      console.log("Empty request body")
      return NextResponse.json({ error: "Empty request body" }, { status: 400 })
    }

    let body
    try {
      body = JSON.parse(text)
    } catch (e) {
      console.error("JSON parse error:", e)
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { 
      emailId, 
      energyLevel, 
      subject, 
      senderEmail, 
      senderName,
      timeOfDay,
      dayOfWeek,
      isRead,
      hasAttachments,
      threadLength,
      estimatedReadingTime,
      notes,
    } = body

    console.log("Received energy rating:", { emailId, energyLevel, senderEmail })

    if (!emailId || !energyLevel) {
      return NextResponse.json({ error: "Missing required fields: emailId, energyLevel" }, { status: 400 })
    }

    // Map energy level to icon and label
    const levelMap: Record<number, { icon: string; label: string }> = {
      1: { icon: '😮‍💨', label: 'Drained' },
      2: { icon: '😐', label: 'Neutral' },
      3: { icon: '⚡', label: 'Energized' },
    }

    const now = new Date()
    const energyData = {
      user_id: user.id,
      email_id: emailId,
      energy_level: energyLevel as EnergyLevel,
      energy_icon: levelMap[energyLevel]?.icon || '😐',
      energy_label: levelMap[energyLevel]?.label || 'Neutral',
      subject: subject || null,
      sender_email: senderEmail || null,
      sender_name: senderName || null,
      time_of_day: timeOfDay ?? now.getHours(),
      day_of_week: dayOfWeek ?? now.getDay(),
      is_read: isRead ?? true,
      has_attachments: hasAttachments ?? false,
      thread_length: threadLength ?? 0,
      estimated_reading_time: estimatedReadingTime ?? 0,
      notes: notes || null,
      updated_at: now.toISOString(),
    }

    console.log("Upserting energy rating:", energyData.email_id)

    // Upsert the rating (insert or update if exists)
    const { data: rating, error } = await supabase
      .from("email_energy_ratings")
      .upsert(energyData, {
        onConflict: 'user_id, email_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving energy rating:", error)
      return NextResponse.json({ error: "Failed to save energy rating", details: error }, { status: 500 })
    }

    console.log("Saved energy rating:", rating?.id)

    return NextResponse.json({ 
      success: true, 
      rating,
      message: `Energy rating saved: ${levelMap[energyLevel]?.label}`,
    })
  } catch (error) {
    console.error("Error saving energy rating:", error)
    return NextResponse.json({ error: "Failed to save energy rating" }, { status: 500 })
  }
}

// Delete an energy rating
export async function DELETE(request: NextRequest) {
  console.log("=== DELETE /api/energy ===")
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get("emailId")

    if (!emailId) {
      return NextResponse.json({ error: "Missing emailId parameter" }, { status: 400 })
    }

    const { error } = await supabase
      .from("email_energy_ratings")
      .delete()
      .eq("user_id", user.id)
      .eq("email_id", emailId)

    if (error) {
      console.error("Error deleting energy rating:", error)
      return NextResponse.json({ error: "Failed to delete energy rating" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Energy rating deleted" })
  } catch (error) {
    console.error("Error deleting energy rating:", error)
    return NextResponse.json({ error: "Failed to delete energy rating" }, { status: 500 })
  }
}

// Options for CORS
export async function OPTIONS() {
  return NextResponse.json({
    methods: ['GET', 'POST', 'DELETE'],
    message: 'Energy API is working'
  })
}
