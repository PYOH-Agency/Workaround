import { describe, it, expect, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { connection } from '@/db/client'
import { consumeIntent, recordIntent } from '@/services/registration-intent'

afterAll(async () => {
  await connection.end()
})

const someEmail = () => `paul-${randomUUID().slice(0, 8)}@test.local`
const NOW = new Date('2026-08-10T10:00:00Z')

describe('l intention d inscription', () => {
  it('se relit par l adresse', async () => {
    const email = someEmail()
    await recordIntent({ email, kind: 'company', siret: '12345678900012', now: NOW })

    expect(await consumeIntent(email, NOW)).toEqual({
      kind: 'company',
      siret: '12345678900012',
      name: null,
    })
  })

  it('normalise l adresse des deux cotes', async () => {
    // Sinon « Paul@Test.fr » ecrit une intention que « paul@test.fr » ne
    // retrouve jamais — et la personne atterrit sur l inscription artisan.
    const email = someEmail()
    await recordIntent({ email: `  ${email.toUpperCase()} `, kind: 'requester', name: 'Paul', now: NOW })

    expect((await consumeIntent(email.toUpperCase(), NOW))?.name).toBe('Paul')
  })

  it('ne se consomme QU UNE FOIS', async () => {
    // Un vieux courriel reclique creerait sinon une seconde entreprise.
    const email = someEmail()
    await recordIntent({ email, kind: 'company', siret: '12345678900012', now: NOW })

    await consumeIntent(email, NOW)
    expect(await consumeIntent(email, NOW)).toBeNull()
  })

  it('rend null pour une adresse sans intention', async () => {
    expect(await consumeIntent(someEmail(), NOW)).toBeNull()
  })

  it('n honore pas une intention de plus de 24 heures', async () => {
    const email = someEmail()
    await recordIntent({ email, kind: 'company', siret: '12345678900012', now: NOW })

    const later = new Date(NOW.getTime() + 25 * 60 * 60 * 1000)
    expect(await consumeIntent(email, later)).toBeNull()
  })

  it('la reinscription ecrase la precedente', async () => {
    // Il s est trompe de SIRET et recommence : c est le dernier geste qui vaut.
    const email = someEmail()
    await recordIntent({ email, kind: 'company', siret: '11111111111111', now: NOW })
    await recordIntent({ email, kind: 'company', siret: '22222222222222', now: NOW })

    expect((await consumeIntent(email, NOW))?.siret).toBe('22222222222222')
  })

  it('purge les intentions perimees a l ecriture', async () => {
    const stale = someEmail()
    await recordIntent({ email: stale, kind: 'company', siret: '33333333333333', now: NOW })

    // Une ecriture bien plus tard doit avoir emporte la precedente.
    const later = new Date(NOW.getTime() + 48 * 60 * 60 * 1000)
    await recordIntent({ email: someEmail(), kind: 'requester', name: 'Autre', now: later })

    const { db } = await import('@/db/client')
    const { registrationIntent } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    const rows = await db.select().from(registrationIntent).where(eq(registrationIntent.email, stale))

    expect(rows).toHaveLength(0)
  })
})
