import { randomBytes } from 'node:crypto'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { appointment, company, customer, project, property } from '@/db/schema'
import { buildIcs, type FeedEvent } from '@/domain/ics'

/**
 * Trois mois en arriere, douze en avant.
 *
 * Un abonnement est re-telecharge EN ENTIER, a repetition : un flux non borne
 * grossirait sans fin et le telephone de l'artisan le rechargerait chaque
 * heure.
 */
const PAST_MONTHS = 3
const AHEAD_MONTHS = 12

/** Cree l'adresse d'abonnement si elle n'existe pas, et la rend. */
export async function agendaFeedToken(companyId: string): Promise<string> {
  const [found] = await db
    .select({ token: company.agendaFeedToken })
    .from(company)
    .where(eq(company.id, companyId))

  if (found?.token) return found.token

  const token = randomBytes(24).toString('base64url')
  await db.update(company).set({ agendaFeedToken: token }).where(eq(company.id, companyId))

  return token
}

/** Regenere l'adresse : l'ancienne cesse aussitot de repondre. */
export async function revokeAgendaFeed(companyId: string): Promise<string> {
  const token = randomBytes(24).toString('base64url')
  await db.update(company).set({ agendaFeedToken: token }).where(eq(company.id, companyId))

  return token
}

/**
 * Le flux d'une entreprise, depuis son jeton. `null` si le jeton est inconnu.
 *
 * Le jeton fait office d'autorisation : il n'y a pas de session derriere une
 * adresse collee dans Google.
 */
export async function agendaFeed(token: string, now: Date): Promise<string | null> {
  const [owner] = await db
    .select({ id: company.id, legalName: company.legalName })
    .from(company)
    .where(eq(company.agendaFeedToken, token))

  if (!owner) return null

  const from = new Date(now)
  from.setMonth(from.getMonth() - PAST_MONTHS)
  const to = new Date(now)
  to.setMonth(to.getMonth() + AHEAD_MONTHS)

  const rows = await db
    .select({
      id: appointment.id,
      kind: appointment.kind,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      note: appointment.note,
      customerName: customer.name,
      customerPhone: customer.phone,
      addressLine1: property.addressLine1,
      postalCode: property.postalCode,
      city: property.city,
      projectLabel: project.label,
    })
    .from(appointment)
    .innerJoin(project, eq(project.id, appointment.projectId))
    .innerJoin(customer, eq(customer.id, project.customerId))
    .innerJoin(property, eq(property.id, project.propertyId))
    .where(
      and(
        eq(appointment.companyId, owner.id),
        // Les rendez-vous annules sont OMIS : le flux est republie en entier a
        // chaque lecture, et l'omission suffit a les faire disparaitre.
        eq(appointment.status, 'scheduled'),
        gte(appointment.startsAt, from),
        lte(appointment.startsAt, to),
      ),
    )

  const events: FeedEvent[] = rows.map((row) => ({
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    summary: `${row.kind === 'visit' ? 'Visite' : 'Intervention'} — ${row.customerName}`,
    location: `${row.addressLine1}, ${row.postalCode} ${row.city}`,
    description: [row.projectLabel, row.customerPhone, row.note].filter(Boolean).join('\n'),
  }))

  return buildIcs({ calendarName: `D’équerre — ${owner.legalName}`, events, stampedAt: now })
}
