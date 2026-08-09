import { describe, it, expect, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, connection } from '@/db/client'
import { appointment } from '@/db/schema'
import {
  bookAppointment,
  cancelAppointment,
  conflictingAppointments,
  weekAgenda,
} from '@/services/appointments'
import { createCompany, createProject } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const at = (iso: string) => new Date(iso)

async function site() {
  const companyId = await createCompany()
  return { companyId, projectId: await createProject(companyId) }
}

const book = (companyId: string, projectId: string, from: string, to: string) =>
  bookAppointment({
    companyId,
    projectId,
    kind: 'visit',
    startsAt: at(from),
    endsAt: at(to),
    note: '',
  })

describe('prendre un rendez-vous', () => {
  it('le pose sur le chantier', async () => {
    const { companyId, projectId } = await site()

    const created = await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z')

    expect(created.projectId).toBe(projectId)
    expect(created.status).toBe('scheduled')
  })

  it('REFUSE le chantier d une autre entreprise', async () => {
    const { projectId } = await site()
    const rival = await createCompany()

    await expect(
      book(rival, projectId, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z'),
    ).rejects.toThrow(/introuvable/)
  })

  it('refuse un creneau irrecevable', async () => {
    const { companyId, projectId } = await site()

    await expect(
      book(companyId, projectId, '2026-09-01T09:00:00Z', '2026-09-01T08:00:00Z'),
    ).rejects.toThrow(/après/)
  })
})

describe('le chevauchement', () => {
  it('signale sans empecher', async () => {
    // La decision du jalon : on avertit, on n'interdit pas. Le second
    // rendez-vous EXISTE apres l'appel.
    const { companyId, projectId } = await site()
    await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T10:00:00Z')

    const found = await conflictingAppointments(companyId, {
      startsAt: at('2026-09-01T09:00:00Z'),
      endsAt: at('2026-09-01T11:00:00Z'),
    })
    const second = await book(companyId, projectId, '2026-09-01T09:00:00Z', '2026-09-01T11:00:00Z')

    expect(found).toHaveLength(1)
    expect(second.id).toBeDefined()
  })

  it('ne voit pas les rendez-vous d une autre entreprise', async () => {
    const { companyId, projectId } = await site()
    await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T10:00:00Z')
    const other = await createCompany()

    expect(
      await conflictingAppointments(other, {
        startsAt: at('2026-09-01T09:00:00Z'),
        endsAt: at('2026-09-01T11:00:00Z'),
      }),
    ).toEqual([])
  })
})

describe('annuler', () => {
  it('ne supprime pas la ligne', async () => {
    const { companyId, projectId } = await site()
    const created = await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z')

    await cancelAppointment(companyId, created.id)

    const [row] = await db.select().from(appointment).where(eq(appointment.id, created.id))
    expect(row.status).toBe('cancelled')
    expect(row.cancelledAt).not.toBeNull()
  })

  it('retire le rendez-vous de la semaine', async () => {
    const { companyId, projectId } = await site()
    const created = await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z')
    await cancelAppointment(companyId, created.id)

    const days = await weekAgenda(companyId, at('2026-09-02T10:00:00Z'))

    expect(days.every((d) => d.items.length === 0)).toBe(true)
  })

  it('REFUSE le rendez-vous d une autre entreprise', async () => {
    const { companyId, projectId } = await site()
    const created = await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z')

    await expect(cancelAppointment(await createCompany(), created.id)).rejects.toThrow(
      /introuvable/,
    )
  })
})

describe('la semaine', () => {
  it('porte l adresse, le client et son numero', async () => {
    // C'est tout l'interet : sans eux, ce serait une ligne de calendrier.
    const { companyId, projectId } = await site()
    await book(companyId, projectId, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z')

    const days = await weekAgenda(companyId, at('2026-09-02T10:00:00Z'))
    const [found] = days.flatMap((d) => d.items)

    expect(found.address).toContain('Bordeaux')
    expect(found.customerName).toBeTruthy()
  })

  it('rend les sept jours et ecarte ce qui n en est pas', async () => {
    const { companyId, projectId } = await site()
    await book(companyId, projectId, '2026-09-20T08:00:00Z', '2026-09-20T09:00:00Z')

    const days = await weekAgenda(companyId, at('2026-09-02T10:00:00Z'))

    expect(days).toHaveLength(7)
    expect(days.every((d) => d.items.length === 0)).toBe(true)
  })

  it('range un rendez-vous du soir dans son jour LOCAL', async () => {
    // 31 aout 23 h 30 UTC = 1er septembre 1 h 30 a Paris.
    const { companyId, projectId } = await site()
    await book(companyId, projectId, '2026-08-31T23:30:00Z', '2026-09-01T00:30:00Z')

    const days = await weekAgenda(companyId, at('2026-09-02T10:00:00Z'))

    expect(days.find((d) => d.day === '2026-09-01')!.items).toHaveLength(1)
  })
})
