import { Pinecone } from '@pinecone-database/pinecone'

// Lazy initialization to avoid errors when API key is missing
let pineconeClient: Pinecone | null = null
let pineconeIndex: ReturnType<Pinecone['index']> | null = null

function getPineconeClient() {
  const apiKey = process.env.PINECONE_API_KEY
  const indexName = process.env.PINECONE_INDEX_NAME

  if (!apiKey || !indexName) {
    return null
  }

  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey })
    pineconeIndex = pineconeClient.index(indexName)
  }

  return pineconeIndex
}

interface EmailMetadata {
  userId: string
  subject: string
  body: string
  from: string
  receivedAt: string
}

export async function upsertEmailVector(
  id: string,
  vector: number[],
  metadata: EmailMetadata
) {
  const index = getPineconeClient()
  if (!index) {
    console.warn('[Pinecone] Skipping vector upsert - not configured')
    return
  }

  await (index as unknown as { upsert: (data: Array<{ id: string; values: number[]; metadata: EmailMetadata }>) => Promise<void> }).upsert([{
    id,
    values: vector,
    metadata,
  }])
}

export async function searchSimilarEmails(
  queryVector: number[],
  userId: string,
  topK: number = 10
) {
  const index = getPineconeClient()
  if (!index) {
    console.warn('[Pinecone] Skipping search - not configured')
    return []
  }

  const results = await (index as unknown as { query: (params: { vector: number[]; topK: number; filter: Record<string, unknown>; includeMetadata: boolean }) => Promise<{ matches: Array<{ id: string; score: number; metadata: EmailMetadata }> }> }).query({
    vector: queryVector,
    topK,
    filter: {
      userId: { $eq: userId },
    },
    includeMetadata: true,
  })

  return results.matches
}

export async function deleteEmailVector(id: string) {
  const index = getPineconeClient()
  if (!index) {
    console.warn('[Pinecone] Skipping vector delete - not configured')
    return
  }

  await (index as unknown as { deleteOne: (id: string) => Promise<void> }).deleteOne(id)
}
