// Using Hugging Face Inference API (Free tier available)
// Token should be set in HUGGING_FACE_TOKEN env variable

const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN
const HF_API_URL = "https://api-inference.huggingface.co/models"

// Helper function to query Hugging Face API
async function queryHF(model: string, inputs: any, parameters?: any): Promise<any> {
  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs,
      parameters,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Hugging Face API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Generate embedding for semantic search using sentence-transformers
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await queryHF("sentence-transformers/all-MiniLM-L6-v2", text)
    return result[0]
  } catch (error) {
    console.error("Embedding error:", error)
    // Return zero vector as fallback
    return new Array(384).fill(0)
  }
}

// Summarize email using BART
export async function summarizeEmail(subject: string, body: string): Promise<string> {
  try {
    const text = `Subject: ${subject}\n\n${body}`
    const result = await queryHF(
      "facebook/bart-large-cnn",
      text,
      { max_length: 150, min_length: 30, do_sample: false }
    )
    return result[0]?.summary_text || ""
  } catch (error) {
    console.error("Summarization error:", error)
    return "Unable to generate summary."
  }
}

// Categorize email using a small language model
export async function categorizeEmail(
  subject: string,
  body: string,
  categories: string[]
): Promise<string> {
  try {
    const text = `Email: Subject: ${subject}\n\n${body}`
    const result = await queryHF(
      "openchat/openchat_3.5",
      {
        messages: [
          {
            role: "system",
            content: `Categorize this email into one of these categories: ${categories.join(", ")}. Respond with only the category name, nothing else.`,
          },
          { role: "user", content: text },
        ],
      },
      { max_tokens: 20, temperature: 0.3 }
    )

    const category = result?.generated_text?.trim() || ""
    
    // Validate category exists
    if (categories.includes(category)) {
      return category
    }
    return "Primary"
  } catch (error) {
    console.error("Categorization error:", error)
    return "Primary"
  }
}

// Generate reply suggestion using openchat
export async function generateReplySuggestion(
  subject: string,
  body: string,
  tone: "professional" | "casual" | "brief" = "professional"
): Promise<string> {
  try {
    const toneInstructions = {
      professional: "Keep it professional and formal.",
      casual: "Keep it friendly and casual.",
      brief: "Keep it very brief and to the point.",
    }

    const result = await queryHF(
      "openchat/openchat_3.5",
      {
        messages: [
          {
            role: "system",
            content: `You are an AI email assistant. ${toneInstructions[tone]} Generate a reply suggestion for the following email.`,
          },
          {
            role: "user",
            content: `Subject: ${subject}\n\n${body}`,
          },
        ],
      },
      { max_tokens: 200, temperature: 0.7 }
    )

    return result?.generated_text || ""
  } catch (error) {
    console.error("Reply generation error:", error)
    return "Unable to generate reply suggestion."
  }
}

// Analyze sentiment using a sentiment model
export async function analyzeSentiment(text: string): Promise<"positive" | "negative" | "neutral"> {
  try {
    const result = await queryHF("distilbert-base-uncased-finetuned-sst-2-english", text)
    const scores = result[0]
    
    // Find the label with highest score
    const label = scores.reduce((a: any, b: any) => (a.score > b.score ? a : b)).label
    
    if (label === "POSITIVE") return "positive"
    if (label === "NEGATIVE") return "negative"
    return "neutral"
  } catch (error) {
    console.error("Sentiment analysis error:", error)
    return "neutral"
  }
}
