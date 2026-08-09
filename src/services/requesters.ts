import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { requester } from '@/db/schema'
import { normalizeEmail } from '@/domain/requester'

/**
 * Le compte du signataire, cree s'il n'existe pas.
 *
 * **Appele AVANT l'insertion de la signature**, et non apres. Le seul echec
 * realiste — la base indisponible — ferait de toute facon echouer la signature
 * elle-meme : il n'existe pas de mode de panne partiel qui vaille d'etre concu.
 * Un `onConflictDoUpdate` absorbe la course de deux devis signes simultanement
 * par la meme personne.
 *
 * Le nom est mis a jour a chaque signature : c'est celui que la personne vient
 * d'ecrire, donc le plus recent.
 */
export async function requesterFromSignature(input: { email: string; name: string }) {
  const email = normalizeEmail(input.email)
  const name = input.name.trim()

  const [row] = await db
    .insert(requester)
    .values({ email, name, source: 'signature' })
    .onConflictDoUpdate({ target: requester.email, set: { name } })
    .returning()

  return row
}

/**
 * Rattache le compte Supabase a la ligne creee lors de la signature.
 *
 * La revendication n'a lieu **que si la ligne n'est reliee a personne** : la
 * condition est un predicat SQL, pas un test JavaScript. Ecrite en JavaScript,
 * elle donnerait a une adresse recyclee l'acces au dossier d'un autre.
 */
export async function claimRequester(userId: string, rawEmail: string) {
  const email = normalizeEmail(rawEmail)

  const [claimed] = await db
    .update(requester)
    .set({ userId })
    .where(and(eq(requester.email, email), isNull(requester.userId)))
    .returning()

  if (claimed) return claimed

  const [existing] = await db.select().from(requester).where(eq(requester.email, email))
  return existing ?? null
}
