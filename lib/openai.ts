import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })

  return response.data[0].embedding
}

export async function summarizeEmail(subject: string, body: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are an AI email assistant. Summarize the following email in 2-3 concise sentences.',
      },
      {
        role: 'user',
        content: `Subject: ${subject}\n\n${body}`,
      },
    ],
    max_tokens: 150,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content || ''
}

export async function categorizeEmail(
  subject: string,
  body: string,
  categories: string[]
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are an AI email categorization assistant. Categorize the email into one of these categories: ${categories.join(', ')}. Respond with only the category name.`,
      },
      {
        role: 'user',
        content: `Subject: ${subject}\n\n${body}`,
      },
    ],
    max_tokens: 20,
    temperature: 0.3,
  })

  const category = response.choices[0]?.message?.content?.trim() || 'Primary'
  
  // Validate category exists
  if (!categories.includes(category)) {
    return 'Primary'
  }

  return category
}

export async function generateReplySuggestion(
  subject: string,
  body: string,
  tone: 'professional' | 'casual' | 'brief' = 'professional'
): Promise<string> {
  const toneInstructions = {
    professional: 'Keep it professional and formal.',
    casual: 'Keep it friendly and casual.',
    brief: 'Keep it very brief and to the point.',
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are an AI email assistant. ${toneInstructions[tone]} Generate a reply suggestion for the following email.`,
      },
      {
        role: 'user',
        content: `Subject: ${subject}\n\n${body}`,
      },
    ],
    max_tokens: 200,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content || ''
}

export async function analyzeSentiment(text: string): Promise<'positive' | 'negative' | 'neutral'> {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'Analyze the sentiment of the following text. Respond with only: positive, negative, or neutral.',
      },
      {
        role: 'user',
        content: text,
      },
    ],
    max_tokens: 10,
    temperature: 0.3,
  })

  const sentiment = response.choices[0]?.message?.content?.trim()?.toLowerCase() || 'neutral'

  if (sentiment.includes('positive')) return 'positive'
  if (sentiment.includes('negative')) return 'negative'
  return 'neutral'
}
