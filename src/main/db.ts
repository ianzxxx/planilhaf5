import { app } from 'electron'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

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
}

async function ensureSchema(): Promise<void> {
  const client = getPrisma()

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Funcionario" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "nome" TEXT NOT NULL DEFAULT '',
      "cargo" TEXT,
      "horarioEntradaPadrao" TEXT,
      "horarioSaidaPadrao" TEXT,
      "minutosAlmocoPadrao" INTEGER DEFAULT 60,
      "ativo" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RegistroPonto" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "funcionarioId" TEXT NOT NULL,
      "data" TEXT NOT NULL,
      "tipoDia" TEXT NOT NULL DEFAULT 'trabalho',
      "horaEntrada" TEXT,
      "horaSaidaAlmoco" TEXT,
      "horaVoltaAlmoco" TEXT,
      "horaSaida" TEXT,
      "horasTrabalhadas" REAL,
      "observacao" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "RegistroPonto_funcionarioId_fkey"
        FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `)

  await migrarColunas(client)

  await client.$executeRawUnsafe(
    `DROP INDEX IF EXISTS "RegistroPonto_funcionarioId_data_key"`
  )

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistroPonto_data_idx" ON "RegistroPonto"("data")
  `)
  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistroPonto_funcionarioId_idx"
      ON "RegistroPonto"("funcionarioId")
  `)
  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistroPonto_funcionarioId_data_idx"
      ON "RegistroPonto"("funcionarioId", "data")
  `)
}

async function colunaExiste(
  client: PrismaClient,
  tabela: string,
  coluna: string
): Promise<boolean> {
  const cols = (await client.$queryRawUnsafe(
    `PRAGMA table_info("${tabela}")`
  )) as Array<{ name: string }>
  return cols.some((c) => c.name === coluna)
}

async function migrarColunas(client: PrismaClient): Promise<void> {
  if (!(await colunaExiste(client, 'Funcionario', 'minutosAlmocoPadrao'))) {
    await client.$executeRawUnsafe(
      `ALTER TABLE "Funcionario" ADD COLUMN "minutosAlmocoPadrao" INTEGER DEFAULT 60`
    )
  }

  if (!(await colunaExiste(client, 'RegistroPonto', 'horaSaidaAlmoco'))) {
    await client.$executeRawUnsafe(
      `ALTER TABLE "RegistroPonto" ADD COLUMN "horaSaidaAlmoco" TEXT`
    )
  }

  if (!(await colunaExiste(client, 'RegistroPonto', 'horaVoltaAlmoco'))) {
    await client.$executeRawUnsafe(
      `ALTER TABLE "RegistroPonto" ADD COLUMN "horaVoltaAlmoco" TEXT`
    )
  }

  if (!(await colunaExiste(client, 'RegistroPonto', 'tipoDia'))) {
    await client.$executeRawUnsafe(
      `ALTER TABLE "RegistroPonto" ADD COLUMN "tipoDia" TEXT NOT NULL DEFAULT 'trabalho'`
    )
  }

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RegistroPonto_tipoDia_idx" ON "RegistroPonto"("tipoDia")
  `)

  // Bancos antigos com horários/horas NOT NULL: relaxar via recriação.
  // Prisma/SQLite devolve notnull como BigInt — comparar com == ou Number().
  const cols = (await client.$queryRawUnsafe(
    `PRAGMA table_info("RegistroPonto")`
  )) as Array<{ name: string; notnull: number | bigint }>

  const colunasOpcionais = [
    'horaEntrada',
    'horaSaida',
    'horaSaidaAlmoco',
    'horaVoltaAlmoco',
    'horasTrabalhadas',
    'observacao'
  ]
  const precisaRelaxar = colunasOpcionais.some((nome) => {
    const col = cols.find((c) => c.name === nome)
    return col != null && Number(col.notnull) === 1
  })

  if (precisaRelaxar) {
    const temAlmoco = cols.some((c) => c.name === 'horaSaidaAlmoco')
    const temVolta = cols.some((c) => c.name === 'horaVoltaAlmoco')
    const temTipoDia = cols.some((c) => c.name === 'tipoDia')

    await client.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`)
    await client.$executeRawUnsafe(`
      CREATE TABLE "RegistroPonto_new" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "funcionarioId" TEXT NOT NULL,
        "data" TEXT NOT NULL,
        "tipoDia" TEXT NOT NULL DEFAULT 'trabalho',
        "horaEntrada" TEXT,
        "horaSaidaAlmoco" TEXT,
        "horaVoltaAlmoco" TEXT,
        "horaSaida" TEXT,
        "horasTrabalhadas" REAL,
        "observacao" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "RegistroPonto_funcionarioId_fkey"
          FOREIGN KEY ("funcionarioId") REFERENCES "Funcionario" ("id")
          ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `)

    await client.$executeRawUnsafe(`
      INSERT INTO "RegistroPonto_new" (
        "id", "funcionarioId", "data", "tipoDia",
        "horaEntrada", "horaSaidaAlmoco", "horaVoltaAlmoco", "horaSaida",
        "horasTrabalhadas", "observacao", "createdAt", "updatedAt"
      )
      SELECT
        "id",
        "funcionarioId",
        "data",
        ${temTipoDia ? `"tipoDia"` : `'trabalho'`},
        "horaEntrada",
        ${temAlmoco ? `"horaSaidaAlmoco"` : 'NULL'},
        ${temVolta ? `"horaVoltaAlmoco"` : 'NULL'},
        "horaSaida",
        "horasTrabalhadas",
        "observacao",
        "createdAt",
        "updatedAt"
      FROM "RegistroPonto"
    `)

    await client.$executeRawUnsafe(`DROP TABLE "RegistroPonto"`)
    await client.$executeRawUnsafe(
      `ALTER TABLE "RegistroPonto_new" RENAME TO "RegistroPonto"`
    )
    await client.$executeRawUnsafe(`PRAGMA foreign_keys = ON`)

    await client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "RegistroPonto_data_idx" ON "RegistroPonto"("data")
    `)
    await client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "RegistroPonto_funcionarioId_idx"
        ON "RegistroPonto"("funcionarioId")
    `)
    await client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "RegistroPonto_funcionarioId_data_idx"
        ON "RegistroPonto"("funcionarioId", "data")
    `)
    await client.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "RegistroPonto_tipoDia_idx" ON "RegistroPonto"("tipoDia")
    `)
  }
}

export async function closeDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
