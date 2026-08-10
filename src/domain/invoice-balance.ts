import type { Cents, Rate } from './money'
import type { TaxBreakdown } from './quote-totals'

/**
 * Reste a facturer sur un devis signe.
 *
 * Le montant ne se saisit pas, il se calcule : total du devis, moins les
 * factures emises, plus les avoirs. Laisser l'artisan saisir un solde libre
 * garantirait des ecarts avec le devis — or l'ecart devis/facture est la
 * metrique reine du passeport.
 */
export type InvoiceType = 'deposit' | 'progress' | 'balance' | 'credit_note'

export interface IssuedInvoice {
  type: InvoiceType
  totalInclTax: Cents
}

export function remainingToInvoice(quoteTotalInclTax: Cents, issued: IssuedInvoice[]): Cents {
  const invoiced = issued.reduce(
    (sum, i) => (i.type === 'credit_note' ? sum - i.totalInclTax : sum + i.totalInclTax),
    0,
  )
  return quoteTotalInclTax - invoiced
}

export function assertInvoiceable(
  quoteTotalInclTax: Cents,
  issued: IssuedInvoice[],
  amountInclTax: Cents,
): void {
  if (amountInclTax <= 0) throw new Error('Le montant doit etre positif')

  const remaining = remainingToInvoice(quoteTotalInclTax, issued)
  if (remaining <= 0) throw new Error('Ce devis est deja integralement facture')

  if (amountInclTax > remaining) {
    throw new Error(
      'Ce montant depasse le reste a facturer. Un depassement passe par un avenant au devis.',
    )
  }
}

/** Une ligne de facture ramenee a l'essentiel : un taux et une base. */
export interface RatedAmount {
  rate: Rate
  unitPriceExclTax: Cents
}

const formatRate = (rate: Rate) => `${(rate / 100).toFixed(1).replace('.', ',')} %`

/**
 * Des montants ventiles, transformes en lignes de facture.
 *
 * Un devis multi-taux produit une ligne par taux. Sans le taux dans le libelle,
 * le client lit deux lignes identiques aux montants differents.
 *
 * Vit ici plutot que dans `src/actions/invoices.ts`, ou elle est nee : les
 * situations en ont besoin aussi, et un service ne doit pas importer d'une
 * action.
 */
export function ratedLines(lines: RatedAmount[], base: string) {
  return lines.map((line) => ({
    label: lines.length > 1 ? `${base} — base TVA ${formatRate(line.rate)}` : base,
    unit: 'u',
    quantity: '1',
    unitPriceExclTax: line.unitPriceExclTax,
    taxRate: line.rate,
  }))
}

/**
 * Ventile un acompte ou une situation sur les taux de TVA du devis finance.
 *
 * Un acompte porte la TVA du devis : appliquer un taux unique a un devis
 * multi-taux produit une declaration de TVA fausse. Le dernier centime est
 * affecte a la derniere ligne pour que la somme tombe juste.
 */
export function splitDepositByRate(byRate: TaxBreakdown[], percent: number): RatedAmount[] {
  if (percent <= 0 || percent > 100) {
    throw new Error(`Le pourcentage doit etre compris entre 1 et 100 : ${percent}`)
  }

  const totalBase = byRate.reduce((sum, b) => sum + b.baseExclTax, 0)
  const target = Math.round((totalBase * percent) / 100)

  const lines = byRate.map((b) => ({
    rate: b.rate,
    unitPriceExclTax: Math.round((b.baseExclTax * percent) / 100),
  }))

  // Rattrapage de l'ecart d'arrondi sur la derniere ligne.
  const drift = target - lines.reduce((sum, l) => sum + l.unitPriceExclTax, 0)
  if (drift !== 0 && lines.length > 0) lines[lines.length - 1].unitPriceExclTax += drift

  return lines
}

/**
 * Ce qui reste a facturer, taux par taux.
 *
 * Le solde ne se deduit **pas** d'un pourcentage du reste : convertir un reste
 * TTC en pourcentage puis le re-ventiler ajoute un arrondi de plus, et laisse un
 * residu de quelques centimes qu'aucune facture ne pourrait solder. On soustrait
 * donc directement, base par base, ce qui a deja ete emis.
 */
export function remainingByRate(
  quoteByRate: TaxBreakdown[],
  issued: { type: InvoiceType; byRate: RatedAmount[] }[],
): RatedAmount[] {
  const invoiced = new Map<Rate, Cents>()

  for (const document of issued) {
    const sign = document.type === 'credit_note' ? -1 : 1
    for (const line of document.byRate) {
      invoiced.set(line.rate, (invoiced.get(line.rate) ?? 0) + sign * line.unitPriceExclTax)
    }
  }

  return quoteByRate
    .map((b) => ({ rate: b.rate, unitPriceExclTax: b.baseExclTax - (invoiced.get(b.rate) ?? 0) }))
    .filter((l) => l.unitPriceExclTax !== 0)
}
