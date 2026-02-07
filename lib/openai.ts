// Using OpenRouter API for AI features
// Get your API key from https://openrouter.ai/keys

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1"

// Free router for summaries (best effort)
const FREE_ROUTER = "openrouter/free"
// Paid mini model for replies (reliable, very cheap)
const REPLY_MODEL = "openai/gpt-4o-mini"

// Helper function to query OpenRouter
async function queryOpenRouter(model: string, messages: any[], maxTokens: number = 300): Promise<string> {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 15000)

  const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://aimail.app",
      "X-Title": "AiMail",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    }),
    signal: controller.signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  
  // Guard against empty responses
  const content =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    ""
  
  if (!content.trim()) {
    throw new Error("AI returned empty response")
  }
  
  return content
}

// Helper function to strip HTML/CSS/code from any text
function cleanText(input: string): string {
  if (!input) return ""
  
  let text = input
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(link|meta)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s*(style|class)\s*=\s*["'][^"']*["']/gi, " ")
    .replace(/([.#][a-zA-Z0-9_-]+)\s*\{[^}]*\}/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/url\([^)]+\)/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  
  return text
}

// Generate embedding for semantic search (using simple text hashing)
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(text.toLowerCase())
    const hash = new Uint8Array(16)
    for (let i = 0; i < data.length; i++) {
      hash[i % 16] = (hash[i % 16] + data[i]) % 256
    }
    
    const vector: number[] = []
    for (let i = 0; i < 384; i++) {
      vector.push((hash[i % 16] / 128) - 1)
    }
    
    return vector
  } catch (error) {
    console.error("Embedding error:", error)
    return new Array(384).fill(0)
  }
}

// Summarize email using free router (works fine for short summaries)
export async function summarizeEmail(subject: string, body: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    console.warn("OPENROUTER_API_KEY not set - using fallback summary")
    const cleanBody = cleanText(body)
    return cleanBody.substring(0, 150) + (cleanBody.length > 150 ? "..." : "")
  }

  try {
    let cleanBody = cleanText(body)
    cleanBody = cleanBody.replace(/--\s[\s\S]*$/gm, " ")
    if (cleanBody.length > 2000) cleanBody = cleanBody.substring(0, 2000)

    const messages = [
      {
        role: "system",
        content: "You are a helpful AI assistant. Summarize the email concisely in plain text. Always provide a summary."
      },
      {
        role: "user",
        content: `Subject: ${subject}\n\nEmail:\n${cleanBody}`
      }
    ]

    const summary = await queryOpenRouter(FREE_ROUTER, messages, 100)
    
    let summaryClean = cleanText(summary)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]+`/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    return summaryClean.length > 0 ? summaryClean : cleanBody.substring(0, 150) + "..."
  } catch (error) {
    console.error("Summarization error:", error)
    const cleanBody = cleanText(body)
    return cleanBody.substring(0, 150) + (cleanBody.length > 150 ? "..." : "")
  }
}

// Categorize email (rule-based + simple keyword matching)
export async function categorizeEmail(subject: string, body: string, categories: string[]): Promise<string> {
  const text = cleanText(`${subject} ${body}`).toLowerCase()

  // Expanded keyword mapping for each category
  const keywords: Record<string, string[]> = {
    "Social": [
      "facebook", "twitter", "instagram", "linkedin", "social media", 
      "friend request", "new follower", "mentioned you", "tagged you",
      "invitation", "connection request", "liked your post", "commented on"
    ],
    "Promotions": [
      "sale", "discount", "offer", "deal", "buy", "shop", 
      "limited time", "promo code", "coupon", "free shipping", 
      "50% off", "% off", "special offer", "flash sale", "best price",
      "order now", "limited stock", "don't miss", "last chance"
    ],
    "Updates": [
      "update", "newsletter", "notification", "alert", "change", 
      "modified", "status", "confirmation", "receipt", "shipping",
      "delivered", "track your order", "your order", "account update"
    ],
    "Forums": [
      "forum", "discussion", "group", "community", "subscribe", 
      "unsubscribe", "new post", "reply to", "thread", "topic"
    ],
  }

  // Find matching category (first match wins)
  for (const [category, words] of Object.entries(keywords)) {
    if (categories.includes(category) && words.some(w => text.includes(w))) {
      return category
    }
  }

  return "Primary"
}

// Generate reply suggestion using paid mini model (reliable for replies)
export async function generateReplySuggestion(
  subject: string,
  body: string,
  tone: "professional" | "casual" | "brief" = "professional"
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    const templates = {
      professional: "Dear Sender,\n\nThank you for your email. I have received your message and will review it shortly.\n\nBest regards",
      casual: "Hi there,\n\nThanks for reaching out! I'll get back to you soon.\n\nBest",
      brief: "Thanks for your email. I'll respond shortly."
    }
    return templates[tone]
  }

  const toneInstructions = {
    professional: "Use a professional, formal tone",
    casual: "Use a friendly, casual tone",
    brief: "Keep it very brief and to the point"
  }

  try {
    const cleanBody = cleanText(body)

    const messages = [
      {
        role: "system",
        content: `You are an email assistant. Write a clear, polite, and complete email reply in plain text. ${toneInstructions[tone]} Always provide a reply.`
      },
      {
        role: "user",
        content: `Write a reply to this email:\n\nSubject: ${subject}\n\nEmail:\n${cleanBody}`
      }
    ]

    // Use paid mini model for reliable replies
    const reply = await queryOpenRouter(REPLY_MODEL, messages, 150)
    
    let cleanReply = cleanText(reply)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    if (cleanReply.length > 0) return cleanReply
  } catch (error) {
    console.error("Reply generation error:", error)
  }

  const templates = {
    professional: "Dear Sender,\n\nThank you for your email. I have received your message and will review it shortly.\n\nBest regards",
    casual: "Hi there,\n\nThanks for reaching out! I'll get back to you soon.\n\nBest",
    brief: "Thanks for your email. I'll respond shortly."
  }

  return templates[tone]
}

// Analyze sentiment (simple keyword-based)
export async function analyzeSentiment(text: string): Promise<"positive" | "negative" | "neutral"> {
  const cleanInput = cleanText(text).toLowerCase()

  const positive = ["thank", "great", "good", "excellent", "happy", "love", "appreciate", "wonderful", "amazing", "fantastic"]
  const negative = ["sorry", "bad", "problem", "issue", "error", "failed", "disappointed", "unfortunately", "wrong", "hate"]

  const posCount = positive.filter(w => cleanInput.includes(w)).length
  const negCount = negative.filter(w => cleanInput.includes(w)).length

  if (posCount > negCount) return "positive"
  if (negCount > posCount) return "negative"
  return "neutral"
}
