// OpenRouter API for sentiment analysis
export async function analyzeSentiment(text: string): Promise<{ score: number; label: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  
  if (!apiKey) {
    // Fallback: simple keyword-based sentiment
    const positive = ['thanks', 'great', 'good', 'excellent', 'happy', 'wonderful', 'appreciate', 'love']
    const negative = ['sorry', 'problem', 'issue', 'bad', 'difficult', 'unfortunately', 'disappointed']
    
    const lower = text.toLowerCase()
    let score = 0
    positive.forEach(w => { if (lower.includes(w)) score += 0.2 })
    negative.forEach(w => { if (lower.includes(w)) score -= 0.2 })
    
    return {
      score: Math.max(-1, Math.min(1, score)),
      label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral'
    }
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nexus-mail.app",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "Analyze the sentiment of this email. Respond with just a number between -1 (very negative) and 1 (very positive), or 0 for neutral. Example responses: 0.8, -0.3, 0"
        }, {
          role: "user",
          content: text.slice(0, 2000)
        }],
        temperature: 0.1,
      }),
    })

    const data = await response.json()
    const score = parseFloat(data.choices?.[0]?.message?.content) || 0
    
    return {
      score,
      label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral'
    }
  } catch (error) {
    console.error("Sentiment analysis error:", error)
    return { score: 0, label: 'neutral' }
  }
}

// Calculate relationship health score
export function calculateHealthScore(interactions: {
  lastContactAt: Date | string | null
  avgResponseTimeMinutes: number | null
  emailsSent: number
  emailsReceived: number
  avgSentiment: number
  commitmentKept: number
  commitmentsMade: number
}): number {
  let score = 0
  
  // Convert string to Date if needed
  const lastContactDate = interactions.lastContactAt instanceof Date 
    ? interactions.lastContactAt 
    : interactions.lastContactAt 
      ? new Date(interactions.lastContactAt)
      : null
  
  // Recency score (0-30 points)
  if (lastContactDate) {
    const daysSince = (Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince <= 1) score += 30
    else if (daysSince <= 7) score += 25
    else if (daysSince <= 14) score += 20
    else if (daysSince <= 30) score += 15
    else if (daysSince <= 60) score += 10
    else if (daysSince <= 90) score += 5
  }
  
  // Response balance (0-25 points)
  if (interactions.emailsSent > 0 || interactions.emailsReceived > 0) {
    const ratio = interactions.emailsReceived / (interactions.emailsSent + interactions.emailsReceived)
    if (ratio >= 0.3 && ratio <= 0.7) score += 25
    else if (ratio >= 0.2 && ratio <= 0.8) score += 20
    else score += 10
  }
  
  // Initiation balance (0-20 points)
  const initiationRatio = interactions.emailsSent / (interactions.emailsSent + interactions.emailsReceived)
  if (initiationRatio >= 0.3 && initiationRatio <= 0.7) score += 20
  else if (initiationRatio >= 0.2 && initiationRatio <= 0.8) score += 15
  else score += 10
  
  // Sentiment (0-15 points)
  const sentimentBonus = (interactions.avgSentiment + 1) / 2 * 15
  score += sentimentBonus
  
  // Commitment keeping (0-10 points)
  if (interactions.commitmentsMade > 0) {
    const commitmentRate = interactions.commitmentKept / interactions.commitmentsMade
    score += commitmentRate * 10
  }
  
  return Math.min(100, Math.max(0, Math.round(score)))
}

// Generate action suggestion
export function generateSuggestion(score: number, lastContactAt: Date | string | null, daysSince: number): string | null {
  if (score >= 90) return "Relationship is thriving! Consider a personal check-in."
  if (score >= 75) return null
  
  if (daysSince > 60) return "Schedule a call or video chat"
  if (daysSince > 30) return "Send a quick check-in email"
  if (daysSince > 14) return "Respond to pending emails"
  
  return "Follow up on your commitments"
}
