import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db, connection } from '@/db/client'
import { quote } from '@/db/schema'
import { monthlyQuoteStats } from '@/services/home'
import { createCompany, createProject } from './invoice-fixtures'

let COMPANY: string
let PROJECT: string

const now = new Date('2026-08-10T09:00:00Z')

async function insertQuote(input: {
  status: 'draft' | 'sent' | 'signed' | 'refused' | 'expired'
  createdAt: Date
  supersedesQuoteId?: string
  version?: number
}): Promise<string> {
  const id = randomUUID()
  await db.insert(quote).values({
    id,
    companyId: COMPANY,
    projectId: PROJECT,
    number: `D2026-${id.slice(0, 4)}`,
    status: input.status,
    createdAt: input.createdAt,
    version: input.version ?? 1,
    supersedesQuoteId: input.supersedesQuoteId ?? null,
    totalExclTax: 100_000,
    totalTax: 0,
    totalInclTax: 100_000,
    publicToken: randomUUID(),
  })
  return id
}

beforeAll(async () => {
  COMPANY = await createCompany()
  PROJECT = await createProject(COMPANY)
})

afterAll(async () => {
  await connection.end()
})

describe('la bande votre mois', () => {
  it('ne compte, comme signes, que des devis etablis ce mois-ci', async () => {
    // Établi ce mois-ci, et signe ce mois-ci : entre dans les deux chiffres.
    await insertQuote({ status: 'signed', createdAt: new Date('2026-08-05T09:00:00Z') })

    // Établi ce mois-ci, encore en attente : entre dans « établis », pas
    // dans « signés ».
    await insertQuote({ status: 'sent', createdAt: new Date('2026-08-02T09:00:00Z') })

    // Établi en JUILLET, signe en aout : avec l'ancien calcul (deux requetes
    // independantes sur `createdAt` et `signedAt`), ce devis grossirait le
    // compte de signes sans jamais apparaitre dans les etablis — un « dont »
    // qui affirme un sous-ensemble inexistant. Il ne doit compter dans
    // aucun des deux chiffres de ce mois-ci.
    await insertQuote({ status: 'signed', createdAt: new Date('2026-07-15T09:00:00Z') })

    // Un avenant cree ce mois-ci sur un devis plus ancien : ce n'est pas un
    // devis établi, c'est une nouvelle ligne sur un devis existant.
    const root = await insertQuote({ status: 'signed', createdAt: new Date('2026-06-01T09:00:00Z') })
    await insertQuote({
      status: 'signed',
      createdAt: new Date('2026-08-07T09:00:00Z'),
      supersedesQuoteId: root,
      version: 2,
    })

    const stats = await monthlyQuoteStats(COMPANY, now)

    expect(stats.issued).toBe(2)
    expect(stats.signed).toBe(1)
  })
})
