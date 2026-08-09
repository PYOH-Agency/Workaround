import { randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { metricDispute, quote } from '@/db/schema'
import { businessDaysSince } from '@/domain/business-days'
import {
  assertDisputable,
  disputeStanding,
  expiryOf,
  type Dispute,
  type DisputeStanding,
} from '@/domain/dispute'
import { rootQuoteId } from '@/services/amendments'
import { recordEvent } from '@/services/events'
import { sendDisputeLink } from '@/services/dispute-mail'

const baseUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** La contestation d'un chantier, ou `null`. Sert au calcul comme a l'ecran. */
export async function disputeFor(rootId: string): Promise<Dispute | null> {
  const [row] = await db
    .select({ expiresAt: metricDispute.expiresAt, verdict: metricDispute.verdict })
    .from(metricDispute)
    .where(eq(metricDispute.quoteId, rootId))

  return row ?? null
}

/**
 * L'artisan conteste la mesure de son delai.
 *
 * Le chantier sort du calcul des l'ouverture — article 18 — et y revient de
 * lui-meme au bout de quatorze jours si le client ne repond pas. **Aucune tache
 * planifiee** : l'expiration se deduit de la date a chaque lecture.
 */
export async function openDispute(companyId: string, quoteId: string, reason: string, now: Date) {
  const root = await rootQuoteId(quoteId)

  const found = await db.query.quote.findFirst({
    where: and(eq(quote.id, root), eq(quote.companyId, companyId)),
    with: { project: { with: { company: true, customer: true } } },
  })
  if (!found?.signedAt) throw new Error('Devis introuvable')

  assertDisputable({
    completedAt: found.completedAt,
    committedLeadTimeDays: found.committedLeadTimeDays,
    businessDaysUsed: found.completedAt ? businessDaysSince(found.signedAt, found.completedAt) : 0,
    existing: await disputeFor(root),
    reason,
  })

  const token = randomBytes(24).toString('base64url')

  const [created] = await db
    .insert(metricDispute)
    .values({
      quoteId: root,
      companyId,
      reason: reason.trim(),
      publicToken: token,
      openedAt: now,
      expiresAt: expiryOf(now),
    })
    .returning()

  // Le journal porte le fait, jamais la personne : ni le nom du client, ni son
  // adresse. Le motif n'y figure pas non plus — il est ecrit par l'entreprise
  // mais parle du client, et le journal est immuable.
  await recordEvent({
    type: 'metric.disputed',
    subjectType: 'quote',
    subjectId: root,
    companyId,
    actorType: 'company',
    payload: { measure: 'lead_time', expiresAt: created.expiresAt.toISOString() },
  })

  await sendDisputeLink({
    to: found.project.customer.email,
    customerName: found.project.customer.name,
    companyName: found.project.company.legalName,
    quoteNumber: found.number,
    link: `${baseUrl()}/c/${token}`,
  })

  return created
}

export interface DisputeView {
  quoteNumber: string
  companyName: string
  reason: string
  signedOn: string
  completedOn: string
  committedLeadTimeDays: number
  businessDaysUsed: number
  standing: DisputeStanding
}

/**
 * Charge une contestation depuis son jeton, sans session.
 *
 * Le client n'a pas de compte : le jeton fait office d'autorisation, comme pour
 * la signature de M1. **On ne lui montre que le chantier concerne** — jamais
 * les metriques de l'entreprise, qui ne le regardent pas et qui orienteraient
 * sa reponse.
 */
export async function loadDisputeByToken(token: string, now: Date): Promise<DisputeView | null> {
  const found = await db.query.metricDispute.findFirst({
    where: eq(metricDispute.publicToken, token),
    with: { quote: { with: { project: { with: { company: true } } } } },
  })

  if (!found?.quote.signedAt || !found.quote.completedAt) return null

  return {
    quoteNumber: found.quote.number,
    companyName: found.quote.project.company.legalName,
    reason: found.reason,
    signedOn: found.quote.signedAt.toLocaleDateString('fr-FR'),
    completedOn: found.quote.completedAt.toLocaleDateString('fr-FR'),
    committedLeadTimeDays: found.quote.committedLeadTimeDays ?? 0,
    businessDaysUsed: businessDaysSince(found.quote.signedAt, found.quote.completedAt),
    standing: disputeStanding(found, now),
  }
}

/**
 * Le client tranche.
 *
 * Le declencheur `metric_dispute_single_arbitration` refuse une seconde
 * ecriture : cette fonction n'a donc pas a la prevenir, elle a a la laisser
 * remonter. Une garde en JavaScript donnerait l'illusion de la protection tout
 * en laissant passer deux envois simultanes.
 */
export async function arbitrate(
  token: string,
  verdict: 'upheld' | 'rejected',
  now: Date,
): Promise<void> {
  const [updated] = await db
    .update(metricDispute)
    .set({ verdict, answeredAt: now })
    .where(eq(metricDispute.publicToken, token))
    .returning()

  if (!updated) throw new Error('Contestation introuvable')

  // L'evenement rectificatif : il neutralise l'evenement initial sans le
  // modifier — la meme regle que l'avoir qui corrige une facture.
  await recordEvent({
    type: 'metric.arbitrated',
    subjectType: 'quote',
    subjectId: updated.quoteId,
    companyId: updated.companyId,
    actorType: 'customer',
    payload: { measure: 'lead_time', verdict },
  })
}

/** Les contestations sans reponse dont le delai court encore. */
export async function disputesInReview(companyId: string, now: Date) {
  const rows = await db
    .select({
      quoteId: metricDispute.quoteId,
      quoteNumber: quote.number,
      reason: metricDispute.reason,
      expiresAt: metricDispute.expiresAt,
    })
    .from(metricDispute)
    .innerJoin(quote, eq(quote.id, metricDispute.quoteId))
    .where(and(eq(metricDispute.companyId, companyId), isNull(metricDispute.verdict)))

  // L'echeance decide, pas le stockage : une contestation expiree est close
  // sans que rien n'ait eu a l'ecrire.
  return rows.filter((row) => row.expiresAt.getTime() > now.getTime())
}
