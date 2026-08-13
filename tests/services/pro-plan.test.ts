import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { event } from '@/db/schema'
import { hasPendingProRequest, requestProActivation, switchPlan } from '@/services/plan'
import { createCompany } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const requests = (companyId: string) =>
  db
    .select()
    .from(event)
    .where(and(eq(event.subjectId, companyId), eq(event.type, 'company.pro_requested')))

const ask = (companyId: string) =>
  requestProActivation({ companyId, legalName: 'Entreprise de test', siret: '123', by: randomUUID() })

describe('demander l offre Pro', () => {
  it('enregistre une demande, et la voit alors en attente', async () => {
    const companyId = await createCompany()

    expect(await hasPendingProRequest(companyId)).toBe(false)
    await ask(companyId)
    expect(await hasPendingProRequest(companyId)).toBe(true)
  })

  it('est idempotente : deux clics, une seule demande', async () => {
    const companyId = await createCompany()

    await ask(companyId)
    await ask(companyId)

    expect(await requests(companyId)).toHaveLength(1)
  })

  it('n est plus en attente une fois le plan bascule', async () => {
    // La bascule est plus recente que la demande : l'ecran ne dit plus « en
    // attente » a une entreprise qui a obtenu ce qu'elle demandait.
    const companyId = await createCompany()

    await ask(companyId)
    await switchPlan({ companyId, plan: 'pro', by: randomUUID() })

    expect(await hasPendingProRequest(companyId)).toBe(false)
  })

  it('ne demande RIEN pour une entreprise deja Pro', async () => {
    const companyId = await createCompany()
    await switchPlan({ companyId, plan: 'pro', by: randomUUID() })

    await ask(companyId)

    expect(await requests(companyId)).toHaveLength(0)
  })
})
