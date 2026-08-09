import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { metricStatement, quote } from '@/db/schema'
import { rootQuoteId } from '@/services/amendments'
import { recordEvent } from '@/services/events'

/**
 * Elle est publiee **a cote** d'un chiffre, pas a la place. Au-dela, ce n'est
 * plus un contexte, c'est une reponse.
 */
export const MAX_STATEMENT_LENGTH = 500

/**
 * La declaration complementaire — article 16.
 *
 * Le passeport est **derive et non editable** : l'artisan ne peut pas corriger
 * un fait exact. Mais un droit de rectification qui n'aboutit a rien n'est pas
 * un droit — il doit pouvoir attacher son contexte au chantier.
 *
 * **Elle ne change aucun chiffre.** Aucune metrique ne la lit ; c'est
 * volontaire, et c'est ce qui la distingue de la contestation, qui elle passe
 * par l'arbitrage du client.
 */
export async function saveStatement(companyId: string, quoteId: string, body: string) {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('La déclaration est vide')
  if (trimmed.length > MAX_STATEMENT_LENGTH) {
    throw new Error(`Déclaration trop longue (${MAX_STATEMENT_LENGTH} caractères maximum)`)
  }

  const root = await rootQuoteId(quoteId)

  const [owned] = await db
    .select({ id: quote.id })
    .from(quote)
    .where(and(eq(quote.id, root), eq(quote.companyId, companyId)))
  if (!owned) throw new Error('Devis introuvable')

  const [saved] = await db
    .insert(metricStatement)
    .values({ quoteId: root, companyId, body: trimmed })
    // C'est le texte de l'artisan sur lui-meme, pas un fait constate : la regle
    // d'immuabilite du journal ne s'y applique pas, il peut le reecrire.
    .onConflictDoUpdate({
      target: metricStatement.quoteId,
      set: { body: trimmed, updatedAt: new Date() },
    })
    .returning()

  // Le journal garde la trace du geste, pas le texte : celui-ci est reecrivable
  // et le journal ne l'est pas — y recopier chaque version en figerait une.
  await recordEvent({
    type: 'metric.statement_saved',
    subjectType: 'quote',
    subjectId: root,
    companyId,
    actorType: 'company',
    payload: { length: trimmed.length },
  })

  return saved
}

export async function statementFor(quoteId: string) {
  const [row] = await db
    .select({ body: metricStatement.body, updatedAt: metricStatement.updatedAt })
    .from(metricStatement)
    .where(eq(metricStatement.quoteId, quoteId))

  return row ?? null
}
