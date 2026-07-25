import { app } from 'electron'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

let prisma: PrismaClient | null = null

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'ponto.db')
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Banco de dados ainda não foi inicializado')
  }
  return prisma
}

export async function initDatabase(): Promise<void> {
  const dbPath = getDbPath()
  const dbUrl = `file:${dbPath}`
  process.env.DATABASE_URL = dbUrl

  fs.mkdirSync(path.dirname(dbPath), { recursive: true })

  prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl }
    }
  })

  await prisma.$connect()
  await ensureSchema()
  await seedIfEmpty()
}

async function ensureSchema(): Promise<void> {
  const client = getPrisma()

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Usuario" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "senhaHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'secretaria',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_email_key" ON "Usuario"("email")
  `)

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Funcionario" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "nome" TEXT NOT NULL,
      "cargo" TEXT,
      "horarioEntradaPadrao" TEXT,
      "horarioSaidaPadrao" TEXT,
      "ativo" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RegistroPonto" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "funcionarioId" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "horaEntrada" TEXT NOT NULL,
      "horaSaida" TEXT NOT NULL,
      "horasTrabalhadas" REAL NOT NULL,
      "observacao" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "RegistroPonto_funcionarioId_fkey"
        FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `)

  await client.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "RegistroPonto_funcionarioId_data_key"
      ON "RegistroPonto"("funcionarioId", "data")
  `)

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistroPonto_data_idx" ON "RegistroPonto"("data")
  `)

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistroPonto_funcionarioId_idx"
      ON "RegistroPonto"("funcionarioId")
  `)
}

async function seedIfEmpty(): Promise<void> {
  const client = getPrisma()
  const count = await client.usuario.count()
  if (count > 0) return

  const senhaHash = await bcrypt.hash('secretaria123', 10)

  await client.usuario.create({
    data: {
      email: 'secretaria@escritorio.local',
      senhaHash,
      role: 'secretaria'
    }
  })

  await client.funcionario.createMany({
    data: [
      {
        nome: 'Ana Souza',
        cargo: 'Assistente administrativa',
        horarioEntradaPadrao: '08:00',
        horarioSaidaPadrao: '17:00'
      },
      {
        nome: 'Bruno Lima',
        cargo: 'Estagiário',
        horarioEntradaPadrao: '09:00',
        horarioSaidaPadrao: '15:00'
      }
    ]
  })
}

export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
