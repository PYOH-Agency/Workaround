import type { Cents } from './money'

/**
 * La chronologie d'un chantier, vue par son client.
 *
 * **Sa colonne vertebrale est derivee** de faits que l'outil detient deja : ce
 * que l'artisan publie vient s'y intercaler, il ne la constitue pas. C'est la
 * seule forme sous laquelle une obligation nouvelle — publier — ne se retourne
 * pas contre la page qu'elle devait servir : s'il ne publie rien, la page reste
 * vraie et lisible.
 *
 * Rien n'est stocke : la chronologie se recalcule a chaque lecture, comme la
 * visibilite de M3, le classement de M4 et les metriques de M5.
 */
/** Un message de chantier, lu par un particulier. Au-dela, c'est un rapport. */
export const MAX_POST_LENGTH = 500

/**
 * Quatre photos par publication.
 *
 * La borne n'est pas technique : sans elle le fil devient un album, c'est-a-dire
 * un autre produit — avec sa conservation, sa moderation et ses attentes.
 */
export const MAX_PHOTOS = 4

export type TimelineKind =
  | 'quote_signed'
  | 'amendment_signed'
  | 'invoice_deposit'
  | 'invoice_progress'
  | 'invoice_balance'
  | 'invoice_credit_note'
  | 'payment'
  | 'appointment'
  | 'completed'
  | 'post'

export interface TimelineEntry {
  at: Date
  kind: TimelineKind
  amountInclTax?: Cents
  body?: string
  photoPaths?: string[]
  version?: number
}

export interface ChantierFacts {
  signedAt: Date
  completedAt: Date | null
  amendments: { version: number; signedAt: Date }[]
  invoices: {
    type: 'deposit' | 'progress' | 'balance' | 'credit_note'
    issuedAt: Date
    totalInclTax: Cents
  }[]
  payments: { receivedAt: Date; amount: Cents }[]
  posts: { createdAt: Date; body: string; photoPaths: string[] }[]
  /** Les rendez-vous EN COURS : un rendez-vous annule ne se promet pas. */
  appointments: { at: Date }[]
}

const INVOICE_KINDS = {
  deposit: 'invoice_deposit',
  progress: 'invoice_progress',
  balance: 'invoice_balance',
  credit_note: 'invoice_credit_note',
} as const

/**
 * A instant egal, l'ordre du recit : ce qui est demande precede ce qui est
 * encaisse, et la fin de chantier ferme toujours la journee. Sans ce rang,
 * l'affichage dependrait de l'ordre des lignes rendues par la base.
 */
const RANK: Record<TimelineKind, number> = {
  quote_signed: 0,
  amendment_signed: 1,
  invoice_deposit: 2,
  invoice_progress: 2,
  invoice_balance: 2,
  invoice_credit_note: 2,
  // Un rendez-vous se prend avant qu'une facture ne parte.
  appointment: 1,
  payment: 3,
  post: 4,
  completed: 5,
}

export function buildTimeline(facts: ChantierFacts): TimelineEntry[] {
  const entries: TimelineEntry[] = [{ at: facts.signedAt, kind: 'quote_signed' }]

  for (const amendment of facts.amendments) {
    entries.push({ at: amendment.signedAt, kind: 'amendment_signed', version: amendment.version })
  }

  for (const issued of facts.invoices) {
    entries.push({
      at: issued.issuedAt,
      kind: INVOICE_KINDS[issued.type],
      amountInclTax: issued.totalInclTax,
    })
  }

  for (const received of facts.payments) {
    entries.push({ at: received.receivedAt, kind: 'payment', amountInclTax: received.amount })
  }

  for (const post of facts.posts) {
    entries.push({
      at: post.createdAt,
      kind: 'post',
      body: post.body,
      photoPaths: post.photoPaths,
    })
  }

  for (const meeting of facts.appointments) {
    entries.push({ at: meeting.at, kind: 'appointment' })
  }

  if (facts.completedAt) entries.push({ at: facts.completedAt, kind: 'completed' })

  // Dans le sens du temps : un chantier se lit en avancant.
  return entries.sort((a, b) => a.at.getTime() - b.at.getTime() || RANK[a.kind] - RANK[b.kind])
}
