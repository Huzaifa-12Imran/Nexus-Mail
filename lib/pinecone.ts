import { Pinecone } from '@pinecone-database/pinecone'

const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
})

export const pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX_NAME!)

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
  await (pineconeIndex as unknown as { upsert: (data: Array<{ id: string; values: number[]; metadata: EmailMetadata }>) => Promise<void> }).upsert([{
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
  const results = await (pineconeIndex as unknown as { query: (params: { vector: number[]; topK: number; filter: Record<string, unknown>; includeMetadata: boolean }) => Promise<{ matches: Array<{ id: string; score: number; metadata: EmailMetadata }> }> }).query({
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
  await (pineconeIndex as unknown as { deleteOne: (id: string) => Promise<void> }).deleteOne(id)
}
