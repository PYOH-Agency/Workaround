import { randomBytes } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, invoiceLine, quote } from '@/db/schema'
import { formatInvoiceNumber } from '@/domain/invoice-number'
import { assertInvoiceable, type InvoiceType } from '@/domain/invoice-balance'
import { engagedTotal, referenceVersion } from '@/domain/quote-versions'
import { quoteVersions, rootQuoteId } from '@/services/amendments'
import { computeTotals, type LineInput } from '@/domain/quote-totals'
import { missingInvoiceMentions, LEGAL_RECOVERY_INDEMNITY_CENTS } from '@/domain/legal-mentions'
import { multiply } from '@/domain/money'
import { recordEvent } from '@/services/events'

/**
 * Ce dont ce module a besoin pour ecrire : la base, ou une transaction ouverte
 * sur elle. Drizzle donne la meme interface aux deux, mais pas le meme type.
 */
type Executor = Pick<typeof db, 'execute' | 'insert' | 'select'>

/**
 * Attribue le rang suivant de la sequence de facturation.
 *
 * `INSERT … ON CONFLICT DO UPDATE … RETURNING` incremente et lit le compteur en
 * une seule instruction atomique : deux appels concurrents ne peuvent pas
 * obtenir le meme rang, et aucun rang n'est saute.
 *
 * A appeler **dans la meme transaction que l'insertion de la facture** — c'est
 * a cela que sert le parametre `tx`. Un rang attribue puis abandonne laisserait
 * un trou dans la sequence, ce qui est un manquement comptable.
 */
export async function allocateInvoiceNumber(
  companyId: string,
  year: number,
  tx: Executor = db,
): Promise<string> {
  const rows = await tx.execute<{ last_sequence: number }>(sql`
    INSERT INTO invoice_counter (company_id, year, last_sequence)
    VALUES (${companyId}, ${year}, 1)
    ON CONFLICT (company_id, year)
    DO UPDATE SET last_sequence = invoice_counter.last_sequence + 1
    RETURNING last_sequence
  `)

  return formatInvoiceNumber(year, Number(rows[0].last_sequence))
}

export interface IssueInvoiceInput {
  companyId: string
  quoteId: string
  type: InvoiceType
  /** Nombre de jours avant echeance, a compter de l'emission. */
  dueInDays: number
  lines: (LineInput & { label: string; unit: string })[]
  correctsInvoiceId?: string
}

/**
 * Emet une facture a partir d'un devis signe.
 *
 * Tout se joue dans une seule transaction : l'attribution du rang et
 * l'insertion de la facture reussissent ou echouent ensemble. Les separer
 * laisserait un trou dans la sequence au premier echec — exactement ce que
 * cette conception existe pour empecher.
 */
export async function issueInvoice(input: IssueInvoiceInput) {
  const source = await db.query.quote.findFirst({
    where: and(eq(quote.id, input.quoteId), eq(quote.companyId, input.companyId)),
    with: { project: { with: { company: true } } },
  })

  if (!source) throw new Error('Devis introuvable')

  // Une facture s'attache toujours a la RACINE de la chaine de versions : le
  // chantier est identifie par son devis d'origine, quel que soit le nombre
  // d'avenants signes depuis. Sans cela, un avenant n'aurait aucune facture
  // rattachee, le plafond se reinitialiserait, et tout serait refacturable.
  const root = await rootQuoteId(input.quoteId)
  const versions = await quoteVersions(root)

  // La condition porte sur l'existence d'une version signee, pas sur le statut
  // de celle qu'on passe : un brouillon d'avenant ne doit pas ouvrir la
  // facturation, et un devis signe puis amende doit continuer de la permettre.
  if (!referenceVersion(versions)) throw new Error('Seul un devis signe peut etre facture')

  const company = source.project.company
  const missing = missingInvoiceMentions(company)
  if (missing.length > 0) {
    throw new Error("Completez les mentions obligatoires avant d'emettre une facture")
  }

  if (input.lines.length === 0) throw new Error('Une facture doit comporter au moins une ligne')

  const issued = await db
    .select({ type: invoice.type, totalInclTax: invoice.totalInclTax })
    .from(invoice)
    .where(eq(invoice.quoteId, root))

  const totals = computeTotals(input.lines)

  // Un avoir reduit la facturation : lui appliquer le plafond de depassement
  // empecherait de corriger une erreur.
  if (input.type !== 'credit_note') {
    // Le plafond est celui de la DERNIERE version signee, pas du devis
    // d'origine : c'est ce qui debloque l'artisan dont le chantier a grossi.
    assertInvoiceable(engagedTotal(versions), issued, totals.totalInclTax)
  }

  const now = new Date()

  const created = await db.transaction(async (tx) => {
    const number = await allocateInvoiceNumber(input.companyId, now.getFullYear(), tx)

    const [row] = await tx
      .insert(invoice)
      .values({
        companyId: input.companyId,
        projectId: source.projectId,
        quoteId: root,
        number,
        type: input.type,
        correctsInvoiceId: input.correctsInvoiceId ?? null,
        issuedAt: now,
        dueAt: new Date(now.getTime() + input.dueInDays * 86_400_000),
        totalExclTax: totals.totalExclTax,
        totalTax: totals.totalTax,
        totalInclTax: totals.totalInclTax,
        // Figes a l'emission : la facture est immuable, ses mentions aussi.
        latePaymentRate: company.latePaymentRate!,
        recoveryIndemnity: LEGAL_RECOVERY_INDEMNITY_CENTS,
        operationType: company.operationType,
        publicToken: randomBytes(24).toString('base64url'),
      })
      .returning()

    await tx.insert(invoiceLine).values(
      input.lines.map((line, i) => ({
        invoiceId: row.id,
        position: i,
        label: line.label,
        unit: line.unit,
        quantity: line.quantity,
        unitPriceExclTax: line.unitPriceExclTax,
        taxRate: line.taxRate,
      })),
    )

    return row
  })

  await recordEvent({
    type: 'invoice.issued',
    subjectType: 'invoice',
    subjectId: created.id,
    companyId: input.companyId,
    actorType: 'company',
    payload: { number: created.number, type: input.type, totalInclTax: totals.totalInclTax },
  })

  return created
}

/**
 * Ce qu'un devis a deja produit comme facturation, ventile par taux.
 *
 * La ventilation est reconstruite depuis les lignes plutot que stockee : la
 * facture est immuable, ses lignes le sont donc aussi, et un total derive de
 * donnees figees ne peut pas diverger.
 */
export async function issuedAgainstQuote(quoteId: string) {
  const rows = await db.query.invoice.findMany({
    where: eq(invoice.quoteId, quoteId),
    with: { lines: true },
  })

  return rows.map((row) => ({
    type: row.type,
    totalInclTax: row.totalInclTax,
    byRate: row.lines.map((line) => ({
      rate: line.taxRate,
      unitPriceExclTax: multiply(line.unitPriceExclTax, line.quantity),
    })),
  }))
}
