import { describe, it, expect, afterAll } from 'vitest'
import { connection } from '@/db/client'
import { agendaFeed, agendaFeedToken, revokeAgendaFeed } from '@/services/agenda-feed'
import { bookAppointment, cancelAppointment } from '@/services/appointments'
import { createCompany, createProject } from './invoice-fixtures'

afterAll(async () => {
  await connection.end()
})

const NOW = new Date('2026-09-01T00:00:00Z')
const at = (iso: string) => new Date(iso)

async function visit(companyId: string, from: string, to: string, note = '') {
  return bookAppointment({
    companyId,
    projectId: await createProject(companyId),
    kind: 'visit',
    startsAt: at(from),
    endsAt: at(to),
    note,
  })
}

describe('l abonnement', () => {
  it('rend le flux de CETTE entreprise, et d aucune autre', async () => {
    // Le controle le plus important du jalon : l'adresse est publique par
    // nature — elle vit dans les serveurs de Google — et elle ne doit ouvrir
    // que l'agenda de son proprietaire.
    const mine = await createCompany()
    const rival = await createCompany()

    await visit(mine, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z')
    const hidden = await visit(
      rival,
      '2026-09-01T08:00:00Z',
      '2026-09-01T09:00:00Z',
      'secret du voisin',
    )

    const feed = await agendaFeed(await agendaFeedToken(mine), NOW)

    expect(feed).toContain('BEGIN:VEVENT')
    expect(feed).not.toContain(hidden.id)
    expect(feed).not.toContain('secret du voisin')
  })

  it('rend null sur un jeton inconnu', async () => {
    expect(await agendaFeed('jeton-inexistant', NOW)).toBeNull()
  })

  it('omet les rendez-vous annules', async () => {
    const companyId = await createCompany()
    const booked = await visit(companyId, '2026-09-02T08:00:00Z', '2026-09-02T09:00:00Z')
    await cancelAppointment(companyId, booked.id)

    expect(await agendaFeed(await agendaFeedToken(companyId), NOW)).not.toContain('BEGIN:VEVENT')
  })

  it('omet ce qui tombe hors de la fenetre', async () => {
    // Un abonnement se retelecharge en entier : un flux non borne grossirait
    // sans fin sur le telephone de l'artisan.
    const companyId = await createCompany()
    await visit(companyId, '2028-09-01T08:00:00Z', '2028-09-01T09:00:00Z')

    expect(await agendaFeed(await agendaFeedToken(companyId), NOW)).not.toContain('BEGIN:VEVENT')
  })

  it('porte l adresse et le telephone du client', async () => {
    // C'est ce que l'artisan vient chercher dans son telephone : ou aller, et
    // qui appeler en arrivant.
    const companyId = await createCompany()
    await visit(companyId, '2026-09-01T08:00:00Z', '2026-09-01T09:00:00Z')

    const feed = await agendaFeed(await agendaFeedToken(companyId), NOW)

    expect(feed).toContain('LOCATION:1 rue du Test\\, 33000 Bordeaux')
    expect(feed).toContain('Chantier de test')
  })

  it('regenerer l adresse fait taire l ancienne', async () => {
    const companyId = await createCompany()
    const first = await agendaFeedToken(companyId)

    const second = await revokeAgendaFeed(companyId)

    expect(second).not.toBe(first)
    expect(await agendaFeed(first, NOW)).toBeNull()
    expect(await agendaFeed(second, NOW)).toContain('BEGIN:VCALENDAR')
  })
})
