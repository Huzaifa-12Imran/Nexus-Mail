// Using Hugging Face Inference API directly (Free)
// Note: Some models require enabling Inference Providers at https://huggingface.co/settings/inference-providers

const HF_TOKEN = process.env.HUGGING_FACE_TOKEN

// Direct API call helper
async function queryHF(endpoint: string, body: any): Promise<any> {
  const response = await fetch(`https://api-inference.huggingface.co${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HF API error: ${response.status}`)
  }

  return response.json()
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

// Generate embedding for semantic search
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await queryHF("/models/sentence-transformers/all-MiniLM-L6-v2", { inputs: text })
    return result || new Array(384).fill(0)
  } catch (error) {
    console.error("Embedding error:", error)
    return new Array(384).fill(0)
  }
}

// Summarize email safely (plain-text only)
export async function summarizeEmail(subject: string, body: string): Promise<string> {
  try {
    let cleanBody = cleanText(body)

    // Remove common email signatures
    cleanBody = cleanBody.replace(/--\s[\s\S]*$/gm, " ")

    // Truncate extremely long emails to first 2000 chars
    if (cleanBody.length > 2000) cleanBody = cleanBody.substring(0, 2000)

    const prompt = `
You are an AI email assistant.
Summarize this email in plain text.
Do NOT include any HTML, CSS, code, or image references.
Ignore banners, inline styles, and formatting instructions.
Keep it concise (1-3 sentences).

Subject: ${subject}

${cleanBody}

Summary:
`

    const result = await queryHF("/models/mistralai/Mistral-7B-Instruct-v0.2", {
      inputs: prompt,
      parameters: {
        max_new_tokens: 150,
        temperature: 0.3
      }
    })

    const summaryRaw = result[0]?.generated_text || ""
    // Use comprehensive cleaning
    let summaryClean = cleanText(summaryRaw)
    
    // Extra aggressive cleaning for any remaining code
    summaryClean = summaryClean
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]+`/g, " ")
      .replace(/https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|svg|webp)/gi, " ")
      .replace(/\[![^\]]*\]/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    return summaryClean.length > 0 ? summaryClean : cleanBody.substring(0, 150) + (cleanBody.length > 150 ? "..." : "")
  } catch (error) {
    console.error("Summarization error:", error)
    const cleanBody = cleanText(body)
    return cleanBody.substring(0, 150) + (cleanBody.length > 150 ? "..." : "")
  }
}

// Categorize email (rule-based + simple classification)
export async function categorizeEmail(subject: string, body: string, categories: string[]): Promise<string> {
  const text = cleanText(`${subject} ${body}`).toLowerCase()

  const keywords: Record<string, string[]> = {
    "Social": ["facebook", "twitter", "instagram", "linkedin", "social media", "friend", "party", "hangout"],
    "Promotions": ["sale", "discount", "offer", "deal", "buy", "shop", "limited time", "promo", "coupon"],
    "Updates": ["update", "news", "notification", "alert", "change", "modified"],
    "Forums": ["forum", "discussion", "group", "community", "subscribe", "unsubscribe"],
  }

  for (const [category, words] of Object.entries(keywords)) {
    if (categories.includes(category) && words.some(w => text.includes(w))) {
      return category
    }
  }

  return "Primary"
}

// Generate reply suggestion
export async function generateReplySuggestion(
  subject: string,
  body: string,
  tone: "professional" | "casual" | "brief" = "professional"
): Promise<string> {
  try {
    const cleanBody = cleanText(body)
    const prompt = `
You are an AI email assistant.
Write a ${tone} reply to this email.
Do NOT include any HTML, CSS, or code.
Only plain text suitable for sending as an email.

Subject: ${subject}

${cleanBody}

Reply:
`

    const result = await queryHF("/models/mistralai/Mistral-7B-Instruct-v0.2", {
      inputs: prompt,
      parameters: { max_new_tokens: 150, temperature: 0.7 }
    })

    const reply = result[0]?.generated_text || ""
    const cleanReply = reply
      .replace(/<[^>]+>/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\s+/g, " ")
      .trim()

    if (cleanReply.length > 0) return cleanReply
  } catch (error) {
    console.error("Reply generation error:", error)
  }

  const templates = {
    professional: `Dear Sender,\n\nThank you for your email. I have received your message and will review it shortly.\n\nBest regards`,
    casual: `Hi there!\n\nThanks for reaching out! I'll get back to you soon.\n\nBest`,
    brief: `Thanks for your email. I'll respond shortly.`
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
