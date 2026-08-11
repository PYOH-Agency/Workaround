import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { insuranceCertificate, quote } from '@/db/schema'
import { can, type Access, type Capability } from '@/domain/authorization'
import {
  certificateIsExpiring,
  completionIsUnbilled,
  orderTasks,
  quoteNeedsFollowUp,
  type Task,
} from '@/domain/home-queue'
import { remainingToInvoice } from '@/domain/invoice-balance'
import { amountDueNow, paymentStatus, type Settlement } from '@/domain/payment-status'
import { referenceVersion } from '@/domain/quote-versions'
import { retentionState } from '@/domain/retention'
import { settlements } from '@/services/invoice-ledger'
import { quoteChains } from '@/services/quote-chains'

const DAY = 86_400_000

/** Ce que chaque nature de ligne exige. Une ligne qu'on ne peut pas traiter ne s'affiche pas. */
const REQUIRED: Record<Task['kind'], Capability> = {
  certificate: 'legal.write',
  overdue_invoice: 'payment.record',
  silent_quote: 'quote.write',
  unbilled_completion: 'invoice.issue',
}

/**
 * `Math.ceil`, comme `daysBetween` du domaine — et c'est la meme frontiere.
 *
 * Avec un plancher, une attestation valable vingt jours et quinze heures
 * s'afficherait a vingt jours alors que le seuil qui l'a fait entrer en file en
 * a compte vingt-et-un. L'ecran contredirait la regle qui l'y a mise.
 */
function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY)
}

/**
 * `Math.floor`, et l'ecart avec `daysUntil` est voulu : un temps ECOULE se
 * compte revolu. Dix-huit jours et quinze heures d'attente font dix-huit jours
 * d'attente, pas dix-neuf.
 */
function daysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / DAY)
}

/**
 * Un jour de mois, en francais.
 *
 * `toLocaleDateString` rend « 1 septembre ». Le francais ecrit « 1er », et
 * c'est le seul jour du mois qui prend un ordinal — une date fausse dans un
 * avertissement d'assurance abime la confiance qu'il demande.
 */
function frenchDate(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleDateString('fr-FR', { month: 'long' })
  return `${day === 1 ? '1er' : day} ${month}`
}

/**
 * Ce qui appelle un geste, et rien d'autre.
 *
 * Chaque ligne est conditionnee par la capacite du geste qu'elle propose : la
 * navigation et la garde lisent deja la meme table, la file la lit aussi.
 * Proposer une action que le serveur refusera est pire que ne rien proposer.
 */
export async function pendingTasks(companyId: string, access: Access, now: Date): Promise<Task[]> {
  const tasks: Task[] = []

  if (can(access, REQUIRED.certificate)) {
    /**
     * La PLUS LOINTAINE des attestations validees, et elle seule.
     *
     * Une entreprise en accumule au fil des renouvellements : toutes les
     * remonter afficherait quatre lignes pour une seule echeance, dont trois
     * deja perimees. C'est la derniere qui dit si la couverture court encore.
     */
    const [certificate] = await db
      .select({ validUntil: insuranceCertificate.validUntil })
      .from(insuranceCertificate)
      .where(
        and(
          eq(insuranceCertificate.companyId, companyId),
          eq(insuranceCertificate.status, 'validated'),
          eq(insuranceCertificate.kind, 'decennale'),
          isNotNull(insuranceCertificate.validUntil),
        ),
      )
      .orderBy(desc(insuranceCertificate.validUntil))
      .limit(1)

    const validUntil = certificate?.validUntil
    if (validUntil && certificateIsExpiring(validUntil, now)) {
      const left = daysUntil(validUntil, now)
      tasks.push({
        kind: 'certificate',
        id: `certificate-${validUntil.toISOString()}`,
        title:
          left >= 0
            ? `Votre attestation décennale expire le ${frenchDate(validUntil)}`
            : 'Votre attestation décennale a expiré',
        detail: 'Sans elle, votre page publique cesse d’être visible',
        amountInclTax: null,
        delay: { sense: 'remaining', days: left },
        href: '/verification',
        action: 'Déposer l’attestation',
      })
    }
  }

  if (can(access, REQUIRED.silent_quote)) {
    const sent = await db
      .select({
        id: quote.id,
        number: quote.number,
        totalInclTax: quote.totalInclTax,
        sentAt: quote.sentAt,
        validityDays: quote.validityDays,
      })
      .from(quote)
      .where(and(eq(quote.companyId, companyId), eq(quote.status, 'sent'), isNotNull(quote.sentAt)))

    for (const row of sent) {
      const sentAt = row.sentAt!
      if (!quoteNeedsFollowUp({ sentAt, validityDays: row.validityDays }, now)) continue

      tasks.push({
        kind: 'silent_quote',
        id: row.id,
        title: `${row.number} · sans réponse`,
        detail: `Envoyé il y a ${daysSince(sentAt, now)} jours`,
        amountInclTax: row.totalInclTax,
        delay: { sense: 'elapsed', days: daysSince(sentAt, now) },
        href: `/devis/${row.id}`,
        action: 'Relancer',
      })
    }
  }

  const { rows, paid } = await settlements(companyId)

  if (can(access, REQUIRED.overdue_invoice)) {
    for (const row of rows) {
      if (row.type === 'credit_note') continue

      const payments = paid.filter((p) => p.invoiceId === row.id).map((p) => p.amount)
      const { withheld } = retentionState(
        { totalInclTax: row.totalInclTax, rate: row.retentionRate, receivedAt: row.receivedAt },
        now,
      )
      const settlement: Settlement = {
        totalInclTax: row.totalInclTax,
        payments,
        dueAt: row.dueAt,
        withheld,
      }

      if (paymentStatus(settlement, now) !== 'overdue') continue

      tasks.push({
        kind: 'overdue_invoice',
        id: row.id,
        title: `Facture échue`,
        detail: `Échue depuis ${daysSince(row.dueAt, now)} jours · retenue de garantie exclue`,
        amountInclTax: amountDueNow(settlement),
        delay: { sense: 'elapsed', days: daysSince(row.dueAt, now) },
        href: `/factures/${row.id}`,
        action: 'Relancer',
      })
    }
  }

  if (can(access, REQUIRED.unbilled_completion)) {
    /**
     * La racine, pour savoir QUELS chantiers sont termines — c'est elle qui
     * porte `completedAt`, quel que soit le nombre d'avenants signes depuis.
     * `totalInclTax` n'est en revanche pas exploite ici : voir plus bas.
     */
    const completed = await db
      .select({ id: quote.id, number: quote.number, completedAt: quote.completedAt })
      .from(quote)
      .where(
        and(
          eq(quote.companyId, companyId),
          eq(quote.status, 'signed'),
          isNotNull(quote.completedAt),
          isNull(quote.supersedesQuoteId),
        ),
      )

    const chains = await quoteChains(companyId)

    for (const root of completed) {
      /**
       * Le dernier avenant SIGNE fait foi, exactement comme `moneyInFlight` —
       * meme bug deja corrige la-bas au commit 5213be7. Un avenant remplace le
       * total precedent, il ne s'y ajoute pas : prendre `root.totalInclTax`
       * sous-estimerait le reste a facturer de tout ce qu'un avenant a ajoute.
       */
      const versions = chains.get(root.id) ?? []
      const engaged = referenceVersion(versions)?.totalInclTax
      if (engaged === undefined) continue

      const chain = new Set(versions.map((version) => version.id))
      const issued = rows
        .filter((row) => row.quoteId !== null && chain.has(row.quoteId))
        .map((row) => ({ type: row.type, totalInclTax: row.totalInclTax }))
      const remaining = remainingToInvoice(engaged, issued)
      const completedAt = root.completedAt!

      if (!completionIsUnbilled({ completedAt, remaining }, now)) continue

      tasks.push({
        kind: 'unbilled_completion',
        id: root.id,
        title: `${root.number} · chantier terminé, reste à facturer`,
        detail: `Terminé il y a ${daysSince(completedAt, now)} jours`,
        amountInclTax: remaining,
        delay: { sense: 'elapsed', days: daysSince(completedAt, now) },
        href: `/devis/${root.id}`,
        action: 'Facturer',
      })
    }
  }

  return orderTasks(tasks)
}
