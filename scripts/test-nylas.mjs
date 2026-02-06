// Test Nylas API endpoints
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const connection = await prisma.emailConnection.findFirst({
    where: { emailAddress: 'huzaifaimran0306@gmail.com' }
  })

  console.log('Connection:', JSON.stringify(connection, null, 2))

  if (connection && connection.grantId) {
    console.log('\nTesting Nylas API endpoints...')

    // Test 1: List grants (should work with client credentials)
    const grantsResponse = await fetch('https://api.nylas.com/v3/grants', {
      headers: {
        'Authorization': `Bearer ${process.env.NYLAS_CLIENT_SECRET}`,
        'Content-Type': 'application/json',
      }
    })
    console.log('\nGrants:', grantsResponse.status, await grantsResponse.text())

    // Test 2: Get specific grant
    const grantResponse = await fetch(`https://api.nylas.com/v3/grants/${connection.grantId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.NYLAS_CLIENT_SECRET}`,
        'Content-Type': 'application/json',
      }
    })
    console.log('Grant details:', grantResponse.status, await grantResponse.text())

    // Test 3: Get messages
    const messagesResponse = await fetch(`https://api.nylas.com/v3/grants/${connection.grantId}/messages?limit=10`, {
      headers: {
        'Authorization': `Bearer ${process.env.NYLAS_CLIENT_SECRET}`,
        'Content-Type': 'application/json',
      }
    })
    console.log('Messages:', messagesResponse.status, await messagesResponse.text())
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
