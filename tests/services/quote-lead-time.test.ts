import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { appointment, quote } from '@/db/schema'
import { companyQuoteLeadTime } from '@/services/quote-lead-time'
import { bookAppointment } from '@/services/appointments'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const NOW = new Date('2026-08-31T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000)

/**
 * Un chantier visite puis devise : visite il y a `delay + 30` jours, devis
 * envoye il y a 30 jours.
 */
async function measured(companyId: string, delay: number) {
  const projectId = await createProject(companyId)

  const booked = await bookAppointment({
    companyId,
    projectId,
    kind: 'visit',
    startsAt: daysAgo(30 + delay),
    endsAt: new Date(daysAgo(30 + delay).getTime() + 3_600_000),
    note: '',
  })

  // `created_at` est pose par la base a l'instant present : on le recule pour
  // que la garde anti-antidatage ne se declenche pas sur un jeu d'essai.
  await db
    .update(appointment)
    .set({ createdAt: daysAgo(31 + delay) })
    .where(eq(appointment.id, booked.id))

  const row = await signedQuote(companyId, projectId, 'sent')
  await db.update(quote).set({ sentAt: daysAgo(30) }).where(eq(quote.id, row.id))

  return { projectId, appointmentId: booked.id }
}

describe('le delai de remise', () => {
  it('mesure de la premiere visite au premier devis envoye', async () => {
    const companyId = await createCompany()
    for (let i = 0; i < 10; i++) await measured(companyId, 3)

    expect(await companyQuoteLeadTime(companyId, NOW)).toEqual({ value: 3, volume: 10 })
  })

  it('ECARTE un chantier sans visite', async () => {
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    const row = await signedQuote(companyId, projectId, 'sent')
    await db.update(quote).set({ sentAt: daysAgo(30) }).where(eq(quote.id, row.id))

    expect(await companyQuoteLeadTime(companyId, NOW).then((m) => m.volume)).toBe(0)
  })

  it('ecarte un chantier dont le devis n a jamais ete envoye', async () => {
    const companyId = await createCompany()
    const projectId = await createProject(companyId)
    await bookAppointment({
      companyId,
      projectId,
      kind: 'visit',
      startsAt: daysAgo(33),
      endsAt: daysAgo(33),
      note: '',
    }).catch(() => undefined)
    await signedQuote(companyId, projectId, 'sent')
    await db.update(quote).set({ sentAt: null }).where(eq(quote.projectId, projectId))

    expect(await companyQuoteLeadTime(companyId, NOW).then((m) => m.volume)).toBe(0)
  })

  it('ne voit PAS les chantiers d une autre entreprise', async () => {
    const mine = await createCompany()
    const rival = await createCompany()
    for (let i = 0; i < 10; i++) await measured(rival, 3)

    expect(await companyQuoteLeadTime(mine, NOW).then((m) => m.volume)).toBe(0)
  })

  it('rend le volume sous le seuil, sans mediane', async () => {
    // La reponse au biais de selection : le volume dit sur quoi le chiffre
    // porte — ou ne porte pas.
    const companyId = await createCompany()
    await measured(companyId, 3)

    expect(await companyQuoteLeadTime(companyId, NOW)).toEqual({ value: null, volume: 1 })
  })
})
