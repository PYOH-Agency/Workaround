import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, payment } from '@/db/schema'
import { recordEvent } from '@/services/events'
import { toCents } from '@/domain/money'

export type PaymentMethod = 'transfer' | 'check' | 'cash' | 'card' | 'other'

export interface NewPayment {
  companyId: string
  invoiceId: string
  amount: string
  receivedAt: Date
  method: PaymentMethod
  reference?: string
}

/**
 * Enregistre un encaissement.
 *
 * Un encaissement n'est pas une modification de la facture : il vit dans sa
 * propre table, ce qui laisse la facture immuable. Le reste du se recalcule a
 * chaque lecture plutot que d'etre stocke — un solde stocke finit toujours par
 * mentir.
 */
export async function recordPayment(input: NewPayment) {
  const target = await db.query.invoice.findFirst({ where: eq(invoice.id, input.invoiceId) })
  if (!target || target.companyId !== input.companyId) throw new Error('Facture introuvable')

  const amount = toCents(input.amount)
  if (amount <= 0) throw new Error('Le montant doit etre positif')

  if (Number.isNaN(input.receivedAt.getTime())) {
    throw new Error("La date d'encaissement est invalide")
  }

  const [created] = await db
    .insert(payment)
    .values({
      invoiceId: input.invoiceId,
      amount,
      receivedAt: input.receivedAt,
      method: input.method,
      reference: input.reference ?? null,
    })
    .returning()

  // Cet evenement alimentera le e-reporting des donnees de paiement : la TVA
  // d'une prestation de services est exigible a l'encaissement.
  await recordEvent({
    type: 'payment.received',
    subjectType: 'invoice',
    subjectId: input.invoiceId,
    companyId: input.companyId,
    actorType: 'company',
    payload: { amount, method: input.method },
  })

  return created
}
