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

// Helper function to strip HTML/CSS from any text
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
    // Remove inline styles and classes
    .replace(/\s*(style|class)\s*=\s*["'][^"']*["']/gi, " ")
    // Remove CSS selectors and properties
    .replace(/\.[a-zA-Z0-9_-]+\s*\{[^}]*\}/g, " ")
    .replace(/#[a-zA-Z0-9_-]+\s*\{[^}]*\}/g, " ")
    // Remove CSS-like patterns
    .replace(/[.#][a-zA-Z0-9_-]+/g, " ")
    .replace(/[{}]/g, " ")
    // Remove URLs
    .replace(/url\([^)]+\)/g, " ")
    // Decode HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/"/gi, '"')
    .replace(/&#\d+;/g, " ")
    // Remove extra whitespace
    .replace(/\s+/g, " ")
    .trim()
  
  return text
}

// Generate embedding for semantic search
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use a lighter embedding model
    const result = await queryHF("/models/sentence-transformers/all-MiniLM-L6-v2", {
      inputs: text,
    })
    return result || new Array(384).fill(0)
  } catch (error) {
    console.error("Embedding error:", error)
    // Return zero vector as fallback
    return new Array(384).fill(0)
  }
}

// Summarize email using BART
export async function summarizeEmail(subject: string, body: string): Promise<string> {
  try {
    // Clean the input text first
    const cleanBody = cleanText(body)
    const text = `Subject: ${subject}\n\n${cleanBody}`
    
    const result = await queryHF("/models/facebook/bart-large-cnn", {
      inputs: text,
      parameters: { max_length: 150, min_length: 30 }
    })
    
    // Clean the output as well
    const summary = result[0]?.summary_text || ""
    return cleanText(summary) || "Unable to generate summary."
  } catch (error) {
    console.error("Summarization error:", error)
    // Return cleaned body preview
    const cleanBody = cleanText(body)
    const preview = cleanBody.substring(0, 150)
    return preview + (cleanBody.length > 150 ? "..." : "")
  }
}

// Categorize email (rule-based + simple classification)
export async function categorizeEmail(
  subject: string,
  body: string,
  categories: string[]
): Promise<string> {
  const text = cleanText(`${subject} ${body}`).toLowerCase()
  
  // Simple keyword-based categorization
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
  
  // Default to Primary
  return "Primary"
}

// Generate reply suggestion using a template-based approach
export async function generateReplySuggestion(
  subject: string,
  body: string,
  tone: "professional" | "casual" | "brief" = "professional"
): Promise<string> {
  try {
    const cleanBody = cleanText(body)
    const prompt = `Write a ${tone} reply to this email:\nSubject: ${subject}\n\n${cleanBody}\n\nReply:`

    const result = await queryHF("/models/microsoft/Phi-3-mini-4k-instruct", {
      inputs: prompt,
      parameters: { max_new_tokens: 150, temperature: 0.7 }
    })

    if (result[0]?.generated_text) {
      return cleanText(result[0].generated_text)
    }
  } catch (error) {
    console.error("Reply generation error:", error)
  }

  // Fallback template responses
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
  
  let posCount = positive.filter(w => cleanInput.includes(w)).length
  let negCount = negative.filter(w => cleanInput.includes(w)).length
  
  if (posCount > negCount) return "positive"
  if (negCount > posCount) return "negative"
  return "neutral"
}
