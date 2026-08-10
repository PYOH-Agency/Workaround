'use server'

import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, quote } from '@/db/schema'
import { requireCapability } from '@/lib/access'
import { computeTotals } from '@/domain/quote-totals'
import { ratedLines, remainingByRate, splitDepositByRate } from '@/domain/invoice-balance'
import { issueInvoice, issuedAgainstQuote } from '@/services/invoices'

/**
 * Emission de factures — couche partagee, et non fonctionnalite `factures`.
 *
 * On facture depuis l'ecran du devis autant que depuis celui des factures :
 * l'emission appartient donc aux deux, c'est-a-dire a aucune des deux. La
 * laisser dans `factures` obligerait `devis` a en dependre, et les deux
 * cesseraient d'etre autonomes.
 */
export interface InvoiceFormState {
  error?: string
  /**
   * Nombre d'enregistrements reussis. Le formulaire s'en sert comme cle de
   * remontage pour se vider — un compteur, et non un booleen, pour que deux
   * enregistrements successifs produisent bien deux valeurs differentes.
   */
  saved?: number
}

/** Charge le devis, ce qu'il a deja produit, et ses totaux. */
async function quoteContext(companyId: string, quoteId: string) {
  const source = await db.query.quote.findFirst({
    where: and(eq(quote.id, quoteId), eq(quote.companyId, companyId)),
    with: { lines: true },
  })
  if (!source) throw new Error('Devis introuvable')

  return {
    source,
    issued: await issuedAgainstQuote(quoteId),
    totals: computeTotals(source.lines),
  }
}

/**
 * Facture d'acompte : un pourcentage du devis, ventile sur ses taux de TVA.
 *
 * L'acompte porte la TVA du devis qu'il finance. Appliquer un taux unique a un
 * devis multi-taux produirait une declaration de TVA fausse.
 */
export async function issueDeposit(
  quoteId: string,
  percent: number,
  _state: InvoiceFormState,
): Promise<InvoiceFormState> {
  const { companyId } = await requireCapability('invoice.issue')

  let created
  try {
    const { source, totals } = await quoteContext(companyId, quoteId)
    created = await issueInvoice({
      companyId,
      quoteId,
      type: 'deposit',
      dueInDays: 30,
      lines: ratedLines(
        splitDepositByRate(totals.byRate, percent),
        `Acompte de ${percent} % sur devis ${source.number}`,
      ),
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Hors du bloc try : `redirect` signale la navigation en levant une
  // exception, qu'un catch avalerait pour l'afficher comme une erreur.
  redirect(`/factures/${created.id}`)
}

/** Situation de travaux : un pourcentage d'avancement, ventile de meme. */
export async function issueProgress(
  quoteId: string,
  percent: number,
  _state: InvoiceFormState,
): Promise<InvoiceFormState> {
  const { companyId } = await requireCapability('invoice.issue')

  let created
  try {
    const { totals } = await quoteContext(companyId, quoteId)
    created = await issueInvoice({
      companyId,
      quoteId,
      type: 'progress',
      dueInDays: 30,
      lines: ratedLines(
        splitDepositByRate(totals.byRate, percent),
        `Situation de travaux — ${percent} % d’avancement`,
      ),
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  redirect(`/factures/${created.id}`)
}

/**
 * Facture de solde : exactement ce qui reste, jamais une saisie libre.
 *
 * Le reste se calcule base par base, et non en pourcentage du reste TTC : une
 * conversion en pourcentage ajouterait un arrondi et laisserait un residu de
 * quelques centimes qu'aucune facture ne pourrait solder. C'est ce qui garantit
 * que la somme des factures egale le devis — donc que la metrique « ecart devis
 * vers facture » du passeport a un sens.
 */
export async function issueBalance(
  quoteId: string,
  _state: InvoiceFormState,
): Promise<InvoiceFormState> {
  const { companyId } = await requireCapability('invoice.issue')

  let created
  try {
    const { issued, totals } = await quoteContext(companyId, quoteId)

    const balance = remainingByRate(totals.byRate, issued)
    if (balance.length === 0) return { error: 'Ce devis est déjà intégralement facturé.' }

    created = await issueInvoice({
      companyId,
      quoteId,
      type: 'balance',
      dueInDays: 30,
      lines: ratedLines(balance, 'Solde du devis'),
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  redirect(`/factures/${created.id}`)
}

/**
 * Avoir : corrige une facture identifiee, sans plafond de depassement.
 *
 * C'est le seul moyen de corriger une erreur — une facture emise ne se modifie
 * jamais.
 */
export async function issueCreditNote(
  invoiceId: string,
  _state: InvoiceFormState,
): Promise<InvoiceFormState> {
  const { companyId } = await requireCapability('invoice.issue')

  let created
  try {
    const target = await db.query.invoice.findFirst({
      where: and(eq(invoice.id, invoiceId), eq(invoice.companyId, companyId)),
      with: { lines: true },
    })
    if (!target || !target.quoteId) return { error: 'Facture introuvable.' }
    if (target.type === 'credit_note') return { error: 'Un avoir ne se corrige pas par un avoir.' }

    created = await issueInvoice({
      companyId,
      quoteId: target.quoteId,
      type: 'credit_note',
      dueInDays: 0,
      correctsInvoiceId: target.id,
      lines: [...target.lines]
        .sort((a, b) => a.position - b.position)
        .map((line) => ({
          label: `Avoir sur ${target.number} — ${line.label}`,
          unit: line.unit,
          quantity: line.quantity,
          unitPriceExclTax: line.unitPriceExclTax,
          taxRate: line.taxRate,
        })),
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  redirect(`/factures/${created.id}`)
}
