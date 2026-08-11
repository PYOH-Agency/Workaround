import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import type { QuoteVersion } from '@/domain/quote-versions'

/**
 * Les devis d'une entreprise, ranges par chaine de versions.
 *
 * **Partage entre `home.ts` et `home-tasks.ts`, et c'est le point.** Les deux
 * calculent un reste a facturer sur le total ENGAGE — le dernier avenant signe
 * — jamais sur le devis d'origine ; dupliquer cette traversee les ferait
 * diverger a la premiere correction faite d'un seul cote.
 *
 * En memoire et non par requete : `rootQuoteId` remonte la chaine d'un devis a
 * coups d'aller-retour, ce qui convient a une action mais pas a un ecran qui
 * les traite tous.
 *
 * **Tous les statuts, et c'est indispensable.** Un maillon refuse ou expire
 * relie quand meme sa version suivante a la racine : filtrer `signed` dans la
 * requete couperait la chaine en deux, et un chantier a trois versions dont la
 * deuxieme fut refusee se compterait deux fois. `passport-metrics.ts` filtre le
 * statut en SQL parce qu'il ne remonte aucune chaine — ne pas aligner les deux.
 */
export async function quoteChains(companyId: string): Promise<Map<string, QuoteVersion[]>> {
  const rows = await db
    .select({
      id: quote.id,
      version: quote.version,
      status: quote.status,
      totalInclTax: quote.totalInclTax,
      signedAt: quote.signedAt,
      supersedesQuoteId: quote.supersedesQuoteId,
    })
    .from(quote)
    .where(eq(quote.companyId, companyId))

  const supersedes = new Map(rows.map((row) => [row.id, row.supersedesQuoteId]))

  /** La racine : c'est a elle que les factures restent attachees. */
  const rootOf = (id: string): string => {
    let current = id
    // Borne identique a celle de `rootQuoteId` : une donnee corrompue ne doit
    // pas faire tourner l'accueil en boucle.
    for (let hop = 0; hop < 50 && supersedes.get(current); hop++) {
      current = supersedes.get(current)!
    }
    return current
  }

  const chains = new Map<string, QuoteVersion[]>()
  for (const row of rows) {
    const root = rootOf(row.id)
    chains.set(root, [...(chains.get(root) ?? []), row])
  }

  return chains
}
