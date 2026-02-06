// Update grant ID
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'huzaifaimran0306@gmail.com'
  const grantId = 'f0c38a3a-4470-4289-8f6d-c365d7f4a9b6'

  const connection = await prisma.emailConnection.findFirst({
    where: { emailAddress: email }
  })

  if (connection) {
    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: {
        grantId: grantId,
        isActive: true,
      }
    })
    console.log(`Updated ${email} with grantId: ${grantId}`)
  } else {
    console.log('Connection not found')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
