import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'secretaria@escritorio.local'
  const existente = await prisma.usuario.findUnique({ where: { email } })

  if (!existente) {
    const senhaHash = await bcrypt.hash('secretaria123', 10)
    await prisma.usuario.create({
      data: {
        email,
        senhaHash,
        role: 'secretaria'
      }
    })
    console.log('Usuário seed criado:', email)
  } else {
    console.log('Usuário seed já existe')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
