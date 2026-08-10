import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote, quoteLine, situation, situationLine } from '@/db/schema'
import { multiply } from '@/domain/money'
import { ratedLines, remainingByRate } from '@/domain/invoice-balance'
import { assertSituation, situationByRate, type SituationLine } from '@/domain/situation'
import { referenceVersion } from '@/domain/quote-versions'
import { quoteVersions, rootQuoteId } from '@/services/amendments'
import { issueInvoice, issuedAgainstQuote } from '@/services/invoices'
import { assertProPlan } from '@/services/plan'
import { recordEvent } from '@/services/events'

export interface DeclaredProgress {
  quoteLineId: string
  percent: number
}

/**
 * Les pourcentages de la DERNIERE situation, par ligne de devis.
 *
 * **Un confort de saisie, pas une source d'argent.** Apres un avenant, les
 * lignes sont neuves : ce report ne les retrouve pas et rend un objet vide.
 * Cela ne coute pas un euro — le montant facture ne depend que du cumul declare
 * et de ce qui a deja ete facture. Un report faux coute une ressaisie.
 */
export async function previousProgress(anyVersionId: string): Promise<Record<string, number>> {
  const root = await rootQuoteId(anyVersionId)

  const [last] = await db
    .select({ id: situation.id })
    .from(situation)
    .where(eq(situation.quoteId, root))
    .orderBy(desc(situation.number))
    .limit(1)

  if (!last) return {}

  const declared = await db
    .select({ quoteLineId: situationLine.quoteLineId, percent: situationLine.progressPercent })
    .from(situationLine)
    .where(eq(situationLine.situationId, last.id))

  return Object.fromEntries(declared.map((line) => [line.quoteLineId, line.percent]))
}

/**
 * Les lignes de la version qui fait foi, avec leur avancement declare.
 *
 * Une ligne absente de `progress` vaut zero : l'ecran les envoie toutes, et un
 * oubli cote serveur ne doit jamais facturer plus que ce que l'artisan a vu.
 */
async function referenceLines(
  companyId: string,
  quoteId: string,
  progress: DeclaredProgress[],
): Promise<{ root: string; lines: SituationLine[] }> {
  // **Redondant avec la garde de `issueInvoice`, et gardé.** La verification par
  // mutation l'a montre : retirer cette ligne laisse la suite verte, parce que
  // `issueInvoice` refuse ensuite. Mais elle refuse APRES, et d'ici la les
  // lignes de devis d'une autre entreprise auraient ete lues en memoire. Le
  // perimetre se porte par la requete, au plus tot.
  const [owned] = await db
    .select({ id: quote.id })
    .from(quote)
    .where(and(eq(quote.id, quoteId), eq(quote.companyId, companyId)))

  if (!owned) throw new Error('Devis introuvable')

  const root = await rootQuoteId(quoteId)
  const reference = referenceVersion(await quoteVersions(root))
  if (!reference) throw new Error('Seul un devis signé peut être facturé')

  const rows = await db.select().from(quoteLine).where(eq(quoteLine.quoteId, reference.id))
  const declared = new Map(progress.map((line) => [line.quoteLineId, line.percent]))

  return {
    root,
    lines: rows.map((row) => ({
      quoteLineId: row.id,
      taxRate: row.taxRate,
      totalExclTax: multiply(row.unitPriceExclTax, row.quantity),
      percent: declared.get(row.id) ?? 0,
    })),
  }
}

/**
 * Etablit une situation de travaux, et la facture qui va avec.
 *
 * Le montant est **la difference entre le cumul declare et ce qui a deja ete
 * facture** — jamais un delta saisi. `remainingByRate` fait la soustraction,
 * base par base : la meme fonction que le solde de M2, donc la meme garantie
 * qu'aucun residu de centimes ne peut subsister.
 *
 * Un acompte deja emis s'en trouve deduit, ce qui est la pratique du batiment :
 * l'acompte est une avance sur le marche, pas un supplement.
 *
 * La facture est creee AVANT la trace de la declaration. L'ordre est voulu :
 * si l'ecriture de la situation echouait, la facture resterait juste et la
 * situation suivante calculerait le bon montant — puisqu'elle ne lit que les
 * factures. L'inverse laisserait une declaration sans facture, c'est-a-dire un
 * mensonge.
 */
export async function issueSituation(input: {
  companyId: string
  quoteId: string
  progress: DeclaredProgress[]
  dueInDays?: number
}) {
  await assertProPlan(input.companyId)

  const { root, lines } = await referenceLines(input.companyId, input.quoteId, input.progress)
  assertSituation(lines)

  const target = situationByRate(lines)
  const issued = await issuedAgainstQuote(root)
  const delta = remainingByRate(target, issued).filter((line) => line.unitPriceExclTax > 0)

  if (delta.length === 0) {
    throw new Error('Cette situation ne facture rien de plus que la précédente.')
  }

  const [last] = await db
    .select({ number: situation.number })
    .from(situation)
    .where(eq(situation.quoteId, root))
    .orderBy(desc(situation.number))
    .limit(1)

  const number = (last?.number ?? 0) + 1

  const created = await issueInvoice({
    companyId: input.companyId,
    quoteId: root,
    type: 'progress',
    dueInDays: input.dueInDays ?? 30,
    lines: ratedLines(delta, `Situation de travaux n° ${number}`),
  })

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(situation)
      .values({ quoteId: root, companyId: input.companyId, number, invoiceId: created.id })
      .returning()

    await tx.insert(situationLine).values(
      lines.map((line) => ({
        situationId: row.id,
        quoteLineId: line.quoteLineId,
        progressPercent: line.percent,
      })),
    )
  })

  await recordEvent({
    type: 'situation.issued',
    subjectType: 'quote',
    subjectId: root,
    companyId: input.companyId,
    actorType: 'company',
    payload: { number, invoiceId: created.id },
  })

  return created
}
