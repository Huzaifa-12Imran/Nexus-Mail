import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { analyzeSentiment, calculateHealthScore, generateSuggestion } from "@/lib/relationships-utils"

export async function GET(request: NextRequest) {
  console.log("=== GET /api/relationships ===")
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log("Auth result:", { userId: user?.id, error: authError })

    if (authError || !user) {
      console.log("Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const minScore = parseInt(searchParams.get("minScore") || "0")
    const maxScore = parseInt(searchParams.get("maxScore") || "100")

    console.log("Querying relationships for user:", user.id)

    // Query Supabase directly
    let query = supabase
      .from("relationship_contacts")
      .select("*")
      .eq("user_id", user.id)
      .gte("health_score", minScore)
      .lte("health_score", maxScore)
      .order("health_score", { ascending: true })
      .limit(limit)

    const { data: relationships, error } = await query

    console.log("Query result:", { count: relationships?.length, error })

    if (error) {
      console.error("Error fetching relationships:", error)
      return NextResponse.json({ error: "Failed to fetch relationships", details: error }, { status: 500 })
    }

    return NextResponse.json({ relationships: relationships || [] })
  } catch (error) {
    console.error("Error fetching relationships:", error)
    return NextResponse.json({ error: "Failed to fetch relationships" }, { status: 500 })
  }
}

// Debug endpoint - no auth required
export async function OPTIONS() {
  return NextResponse.json({
    methods: ['GET', 'POST'],
    message: 'API is working'
  })
}

// Analyze a new email and update relationship
export async function POST(request: NextRequest) {
  console.log("=== POST /api/relationships ===")
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
    
    const { emailId, from, to, subject, body: emailBody, direction, sentAt, receivedAt } = body
    console.log("Received:", { emailId, from, to, direction })

    // Extract email addresses
    const extractEmails = (text: string): string[] => {
      const matches = text.match(/[\w.-]+@[\w.-]+\.\w+/g) || []
      return Array.from(new Set(matches))
    }

    const contactEmails = direction === 'outbound' 
      ? extractEmails(to) 
      : extractEmails(from)

    console.log("Contact emails:", contactEmails)

    const results: { email: string; success: boolean; healthScore?: number }[] = []

    for (const contactEmail of contactEmails) {
      console.log("Processing contact:", contactEmail)

      // Find or create relationship
      const { data: relationship, error: findError } = await supabase
        .from("relationship_contacts")
        .select("*")
        .eq("user_id", user.id)
        .eq("email", contactEmail)
        .single()

      console.log("Find result:", { found: !!relationship, error: findError })

      let relId: string
      if (relationship) {
        relId = relationship.id
      } else {
        console.log("Creating new relationship for:", contactEmail)
        const { data: newRel, error: createError } = await supabase
          .from("relationship_contacts")
          .insert({
            user_id: user.id,
            email: contactEmail,
            health_score: 0,
            total_emails: 0,
            emails_sent: 0,
            emails_received: 0,
          })
          .select()
          .single()

        if (createError || !newRel) {
          console.error("Error creating relationship:", createError)
          continue
        }
        relId = newRel.id
        console.log("Created relationship:", relId)
      }

      // Analyze sentiment
      const sentimentResult = await analyzeSentiment(`${subject} ${emailBody}`)
      console.log("Sentiment:", sentimentResult)

      // Create interaction
      const { data: interaction, error: intError } = await supabase
        .from("relationship_interactions")
        .insert({
          relationship_id: relId,
          type: 'email',
          direction,
          email_id: emailId,
          subject,
          sent_at: sentAt || null,
          received_at: receivedAt || null,
          sentiment: sentimentResult.score,
          sentiment_label: sentimentResult.label,
        })
        .select()
        .single()

      if (intError) {
        console.error("Error creating interaction:", intError)
      } else {
        console.log("Created interaction:", interaction?.id)
      }

      // Get all interactions for this relationship
      const { data: allInteractions } = await supabase
        .from("relationship_interactions")
        .select("*")
        .eq("relationship_id", relId)
        .order("created_at", { ascending: false })

      // Calculate metrics
      const emailsSent = allInteractions?.filter((i: any) => i.direction === 'outbound' && i.type === 'email').length || 0
      const emailsReceived = allInteractions?.filter((i: any) => i.direction === 'inbound' && i.type === 'email').length || 0
      const lastContact = allInteractions?.find((i: any) => i.sent_at || i.received_at)
      const sentiments = allInteractions?.filter((i: any) => i.sentiment !== null) || []
      const avgSentiment = sentiments.length > 0
        ? sentiments.reduce((sum: number, i: any) => sum + (i.sentiment || 0), 0) / sentiments.length
        : 0

      // Calculate response time average
      const responses = allInteractions?.filter((i: any) => i.was_response && i.response_time_minutes !== null) || []
      const avgResponseTime = responses.length > 0
        ? responses.reduce((sum: number, i: any) => sum + (i.response_time_minutes || 0), 0) / responses.length
        : null

      // Update relationship health score
      const healthScore = calculateHealthScore({
        lastContactAt: lastContact?.sent_at || lastContact?.received_at || null,
        avgResponseTimeMinutes: avgResponseTime,
        emailsSent,
        emailsReceived,
        avgSentiment,
        commitmentsMade: 0,
        commitmentKept: 0,
      })

      // Determine sentiment trend
      const recentInteractions = allInteractions?.slice(0, 10) || []
      const recentSentiments = recentInteractions.filter((i: any) => i.sentiment !== null) || []
      const recentAvgSentiment = recentSentiments.length > 0
        ? recentSentiments.reduce((sum: number, i: any) => sum + (i.sentiment || 0), 0) / recentSentiments.length
        : 0
      
      let sentimentTrend = 'stable'
      if (recentInteractions.length >= 5) {
        if (recentAvgSentiment > avgSentiment + 0.1) sentimentTrend = 'improving'
        else if (recentAvgSentiment < avgSentiment - 0.1) sentimentTrend = 'declining'
      }

      // Generate suggestion
      const daysSince = lastContact?.sent_at || lastContact?.received_at 
        ? (Date.now() - new Date(lastContact.sent_at || lastContact.received_at).getTime()) / (1000 * 60 * 60 * 24)
        : 999
      const suggestedAction = generateSuggestion(healthScore, lastContact?.sent_at || lastContact?.received_at || null, daysSince)

      // Update relationship
      const { error: updateError } = await supabase
        .from("relationship_contacts")
        .update({
          health_score: healthScore,
          emails_sent: emailsSent,
          emails_received: emailsReceived,
          total_emails: emailsSent + emailsReceived,
          last_contact_at: lastContact?.sent_at || lastContact?.received_at || null,
          last_email_id: emailId,
          recency_score: Math.min(30, Math.max(0, 30 - daysSince / 2)),
          response_score: avgResponseTime ? Math.max(0, 25 - avgResponseTime / 60) : 15,
          initiation_score: emailsSent + emailsReceived > 0 
            ? Math.min(20, Math.abs(emailsSent - emailsReceived) < 5 ? 20 : 10)
            : 10,
          sentiment_score: Math.max(0, (avgSentiment + 1) / 2 * 15),
          commitment_score: 10,
          avg_sentiment: avgSentiment,
          sentiment_trend: sentimentTrend,
          suggested_action: suggestedAction,
          action_suggested_at: suggestedAction ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", relId)

      if (updateError) {
        console.error("Update error:", updateError)
      } else {
        console.log("Updated relationship:", relId, "health:", healthScore)
      }

      results.push({ email: contactEmail, success: true, healthScore })
    }

    console.log("Results:", results)
    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error analyzing relationship:", error)
    return NextResponse.json({ error: "Failed to analyze relationship" }, { status: 500 })
  }
}
