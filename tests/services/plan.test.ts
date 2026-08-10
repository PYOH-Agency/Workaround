import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { event } from '@/db/schema'
import { assertProPlan, planOf, switchPlan } from '@/services/plan'
import { createCompany } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const STAFF = '00000000-0000-4000-8000-000000000001'

describe('le plan d une entreprise', () => {
  it('naît GRATUIT', async () => {
    // Le defaut n'est pas un detail : une entreprise creee Pro par accident
    // devrait etre retrogradee, c'est-a-dire qu'on lui retirerait quelque
    // chose qu'elle avait.
    expect(await planOf(await createCompany())).toBe('free')
  })

  it('bascule, et le fait s inscrit au journal', async () => {
    const companyId = await createCompany()

    await switchPlan({ companyId, plan: 'pro', by: STAFF })

    expect(await planOf(companyId)).toBe('pro')

    const journal = await db.select().from(event).where(eq(event.companyId, companyId))
    const change = journal.find((row) => row.type === 'company.plan_changed')

    expect(change).toBeDefined()
    expect(change!.actorType).toBe('staff')
    expect(change!.payload).toMatchObject({ from: 'free', to: 'pro' })
  })

  it('n inscrit RIEN quand le plan ne change pas', async () => {
    // Un journal qui enregistre des non-evenements cesse d'etre lisible.
    const companyId = await createCompany()
    const before = await db.$count(event, eq(event.companyId, companyId))

    await switchPlan({ companyId, plan: 'free', by: STAFF })

    expect(await db.$count(event, eq(event.companyId, companyId))).toBe(before)
  })
})

describe('la garde de plan, au niveau du service', () => {
  it('refuse une entreprise gratuite', async () => {
    await expect(assertProPlan(await createCompany())).rejects.toThrow(/Pro/)
  })

  it('laisse passer une entreprise Pro', async () => {
    const companyId = await createCompany()
    await switchPlan({ companyId, plan: 'pro', by: STAFF })

    await expect(assertProPlan(companyId)).resolves.toBeUndefined()
  })
})
