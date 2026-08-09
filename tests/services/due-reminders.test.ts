import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { customer, event, project } from '@/db/schema'
import { runAppointmentReminders } from '@/services/due-reminders'
import { bookAppointment, cancelAppointment } from '@/services/appointments'
import { createCompany, createProject } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const NOW = new Date('2026-08-31T06:00:00Z')

/** Un rendez-vous de demain, sur un chantier neuf. */
async function tomorrowVisit() {
  const companyId = await createCompany()
  const projectId = await createProject(companyId)

  const booked = await bookAppointment({
    companyId,
    projectId,
    kind: 'visit',
    startsAt: new Date('2026-09-01T08:00:00Z'),
    endsAt: new Date('2026-09-01T09:00:00Z'),
    note: '',
  })

  return { companyId, projectId, appointmentId: booked.id }
}

/** Le journal de ce rendez-vous. */
const journalOf = (appointmentId: string) =>
  db.select().from(event).where(eq(event.subjectId, appointmentId))

describe('les rappels de la veille', () => {
  it('envoie un rappel pour un rendez-vous de demain', async () => {
    const { appointmentId } = await tomorrowVisit()

    const result = await runAppointmentReminders(NOW)

    expect(result.sent).toBeGreaterThanOrEqual(1)
    expect((await journalOf(appointmentId)).some((e) => e.type === 'appointment.reminded')).toBe(
      true,
    )
  })

  it('n en envoie PAS deux fois', async () => {
    // Un seul rappel, aucune relance : rejouer le travail de fond ne doit rien
    // reenvoyer.
    const { appointmentId } = await tomorrowVisit()
    await runAppointmentReminders(NOW)

    await runAppointmentReminders(NOW)

    expect(await journalOf(appointmentId)).toHaveLength(1)
  })

  it('n envoie rien pour un rendez-vous annule', async () => {
    const { companyId, appointmentId } = await tomorrowVisit()
    await cancelAppointment(companyId, appointmentId)

    await runAppointmentReminders(NOW)

    expect(await journalOf(appointmentId)).toEqual([])
  })

  it('n ecrit AUCUN evenement quand le message n a pas pu partir', async () => {
    // Un rappel consigne mais jamais envoye fabriquerait une preuve fausse.
    // C'est la lecon de M3, et elle vaut ici aussi.
    const { projectId, appointmentId } = await tomorrowVisit()
    const [row] = await db.select().from(project).where(eq(project.id, projectId))
    await db.update(customer).set({ email: '' }).where(eq(customer.id, row.customerId))

    const result = await runAppointmentReminders(NOW)

    expect(result.unreachable).toBeGreaterThanOrEqual(1)
    expect(await journalOf(appointmentId)).toEqual([])
  })

  it('ne rappelle pas un rendez-vous d apres-demain', async () => {
    const companyId = await createCompany()
    const booked = await bookAppointment({
      companyId,
      projectId: await createProject(companyId),
      kind: 'visit',
      startsAt: new Date('2026-09-03T08:00:00Z'),
      endsAt: new Date('2026-09-03T09:00:00Z'),
      note: '',
    })

    await runAppointmentReminders(NOW)

    expect(await journalOf(booked.id)).toEqual([])
  })
})
