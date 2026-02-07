// Using OpenRouter API for AI features (Free models available)
// Get your API key from https://openrouter.ai/keys
// Free model list: https://openrouter.ai/docs/models

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1"

// Free models available on OpenRouter
const FREE_MODEL = "meta-llama/llama-3.2-3b-instruct:free"

// Helper function to query OpenRouter
async function queryOpenRouter(model: string, messages: any[], maxTokens: number = 300): Promise<string> {
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
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

// Helper function to strip HTML/CSS/code from any text
function cleanText(input: string): string {
  if (!input) return ""
  
  let text = input
    // Remove <style> blocks
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    // Remove <script> blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Remove <link> and <meta> tags
    .replace(/<(link|meta)[^>]*>/gi, " ")
    // Remove all HTML tags
    .replace(/<[^>]+>/g, " ")
    // Remove inline CSS and classes
    .replace(/\s*(style|class)\s*=\s*["'][^"']*["']/gi, " ")
    // Remove CSS selectors like .classname { ... } or #id { ... }
    .replace(/([.#][a-zA-Z0-9_-]+)\s*\{[^}]*\}/g, " ")
    // Remove stray { } characters
    .replace(/[{}]/g, " ")
    // Remove URLs
    .replace(/url\([^)]+\)/g, " ")
    // Decode HTML entities (basic)
    .replace(/&nbsp;/gi, " ")
    .replace(/&#\d+;/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
  
  return text
}

// Generate embedding for semantic search (using simple text hashing)
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use a simple text hashing approach as fallback since HF is slow
    // This creates a deterministic vector from text
    const encoder = new TextEncoder()
    const data = encoder.encode(text.toLowerCase())
    const hash = new Uint8Array(16)
    for (let i = 0; i < data.length; i++) {
      hash[i % 16] = (hash[i % 16] + data[i]) % 256
    }
    
    // Create a 384-dimensional vector from the hash
    const vector: number[] = []
    for (let i = 0; i < 384; i++) {
      vector.push((hash[i % 16] / 128) - 1) // Normalize to -1 to 1
    }
    
    return vector
  } catch (error) {
    console.error("Embedding error:", error)
    return new Array(384).fill(0)
  }
}

// Summarize email using OpenRouter (Llama 3 free model)
export async function summarizeEmail(subject: string, body: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    console.warn("OPENROUTER_API_KEY not set - using fallback summary")
    const cleanBody = cleanText(body)
    return cleanBody.substring(0, 150) + (cleanBody.length > 150 ? "..." : "")
  }

  try {
    let cleanBody = cleanText(body)

    // Remove common email signatures
    cleanBody = cleanBody.replace(/--\s[\s\S]*$/gm, " ")

    // Truncate extremely long emails to first 2000 chars
    if (cleanBody.length > 2000) cleanBody = cleanBody.substring(0, 2000)

    const messages = [
      {
        role: "user",
        content: `You are an AI email assistant. Summarize this email in plain text in 1-3 sentences. Do NOT include any HTML, CSS, code, or image references.

Subject: ${subject}

Email:
${cleanBody}

Summary:`
      }
    ]

    const summary = await queryOpenRouter(FREE_MODEL, messages, 100)
    
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

  // Strict keyword mapping - require multiple matches for each category
  const keywords: Record<string, string[]> = {
    "Social": ["facebook", "twitter", "instagram", "linkedin", "social media", "friend request", "new follower"],
    "Promotions": ["sale", "discount", "offer", "deal", "buy", "shop", "limited time", "promo code", "coupon", "free shipping", "50% off", "% off"],
    "Updates": ["update", "newsletter", "notification", "alert", "change", "modified", "status"],
    "Forums": ["forum", "discussion", "group", "community", "subscribe", "unsubscribe", "new post"],
  }

  for (const [category, words] of Object.entries(keywords)) {
    if (categories.includes(category)) {
      // Count how many keywords match
      const matches = words.filter(w => text.includes(w)).length
      // Only categorize if at least 2 keywords match (strict filtering)
      if (matches >= 2) {
        return category
      }
    }
  }

  return "Primary"
}

// Generate reply suggestion using OpenRouter
export async function generateReplySuggestion(
  subject: string,
  body: string,
  tone: "professional" | "casual" | "brief" = "professional"
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    const templates = {
      professional: "Dear Sender,\n\nThank you for your email. I have received your message and will review it shortly.\n\nBest regards",
      casual: "Hi there!\n\nThanks for reaching out! I'll get back to you soon.\n\nBest",
      brief: "Thanks for your email. I'll respond shortly."
    }
    return templates[tone]
  }

  try {
    const cleanBody = cleanText(body)

    const messages = [
      {
        role: "user",
        content: `You are an AI email assistant. Write a ${tone} reply to this email. Only reply with the email body, no subject line, no HTML or CSS.

Subject: ${subject}

Email:
${cleanBody}

Reply:`
      }
    ]

    const reply = await queryOpenRouter(FREE_MODEL, messages, 150)
    
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
    casual: "Hi there!\n\nThanks for reaching out! I'll get back to you soon.\n\nBest",
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
