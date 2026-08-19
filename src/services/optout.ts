import { db } from '@/db/client'
import { mailOptout } from '@/db/schema'
import { verifyOptout } from '@/domain/mail-optout'

/**
 * Enregistre l'opposition portee par le lien « je ne souhaite plus etre
 * contacte », si son jeton est valide.
 *
 * A l'ecart de `attestation-request` : `createRequest` LIT ce registre, mais
 * rien ici ne cree de demande, et les deux n'ont ni le meme appelant ni la
 * meme duree de vie — l'opposition survit a l'anonymisation des demandes.
 *
 * `email` et `token` viennent d'une URL et peuvent manquer ou avoir ete
 * altérés — `verifyOptout` rend alors `false` sans lever, et rien n'est ecrit.
 *
 * Normalisation locale plutot que `normalizeEmail` : celle-ci LEVE sur une
 * adresse vide, ce qui est juste a l'inscription mais transformerait un lien
 * tronque en erreur serveur au lieu du simple `false` attendu ici. Meme choix
 * que dans `mail-optout.ts`, pour la meme raison.
 *
 * L'insertion est idempotente via `onConflictDoNothing` plutot qu'une lecture
 * suivie d'une ecriture : un lien de mail est clique deux fois, transfere,
 * rouvert des mois plus tard — une contrainte d'unicite qui leverait au second
 * clic laisserait croire que l'opposition n'a pas ete prise en compte.
 */
export async function recordOptout(
  email: string | undefined,
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!verifyOptout(email, token, secret)) return false

  await db
    .insert(mailOptout)
    .values({ email: email!.trim().toLowerCase() })
    .onConflictDoNothing()

  return true
}
