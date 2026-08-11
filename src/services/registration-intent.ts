import { and, eq, gte, lt, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { registrationIntent } from '@/db/schema'
import { normalizeEmail } from '@/domain/requester'

/**
 * Vingt-quatre heures, comme `quote_link_request`.
 *
 * Assez pour ouvrir son courriel le lendemain matin, trop peu pour qu'une
 * intention oubliee dorme dans une table de donnees personnelles.
 */
const RETENTION_MS = 24 * 60 * 60 * 1000

/**
 * La tolerance accordee a l'ecart entre deux horloges.
 *
 * `registration_intent.created_at` est datee par l'application, `user.created_at`
 * par Supabase. En local c'est la meme machine ; en production ce sont deux
 * hotes, et si celui de Supabase retarde un peu, une inscription parfaitement
 * legitime verrait son intention rejetee — l'artisan atterrirait sur la porte
 * sans son SIRET, sans rien pour l'expliquer.
 *
 * Une minute ne coute rien a la garde : l'attaque qu'elle ferme se joue sur des
 * comptes nes des jours plus tot, jamais a la seconde pres.
 */
const CLOCK_SKEW_MS = 60 * 1000

export interface Intent {
  kind: 'company' | 'requester'
  siret: string | null
  name: string | null
}

/**
 * Ecrite AVANT l'envoi du lien.
 *
 * L'ordre importe : si l'envoi echoue, une intention orpheline ne coute rien et
 * se purge seule. Dans l'autre ordre, la personne atterrirait avec un compte et
 * sans intention — c'est-a-dire sur l'inscription artisan, quoi qu'elle ait
 * demande.
 *
 * La purge se fait ici plutot que par une tache planifiee, « qu'on oublierait
 * de surveiller » — meme raison que `resendQuoteLinks`.
 */
export async function recordIntent(input: {
  email: string
  kind: 'company' | 'requester'
  siret?: string
  name?: string
  now?: Date
}): Promise<void> {
  const now = input.now ?? new Date()
  const email = normalizeEmail(input.email)
  const values = {
    kind: input.kind,
    siret: input.siret ?? null,
    name: input.name ?? null,
    createdAt: now,
  }

  await db
    .delete(registrationIntent)
    .where(lt(registrationIntent.createdAt, new Date(now.getTime() - RETENTION_MS)))

  await db
    .insert(registrationIntent)
    .values({ email, ...values })
    .onConflictDoUpdate({ target: registrationIntent.email, set: values })
}

/**
 * Lue et supprimee du meme geste.
 *
 * `DELETE ... RETURNING` plutot qu'un `SELECT` puis un `DELETE` : deux clics
 * simultanes sur le meme courriel creeraient sinon deux entreprises.
 *
 * Une intention perimee n'est pas rendue, et n'est pas supprimee non plus — la
 * purge de `recordIntent` s'en charge. Deux mecanismes de suppression pour la
 * meme table divergeraient.
 *
 * **`accountCreatedAt` n'est pas un raffinement : c'est la seule preuve qu'on
 * ait de qui a ECRIT l'intention.** L'ecriture, elle, se fait sans aucune
 * authentification — avant tout aller-retour par la boite mail. Relire par
 * l'adresse authentifiee prouve qui LIT, jamais qui a ecrit.
 *
 * Sans cette condition, l'attaque tient en deux champs : un anonyme saisit un
 * SIRET actif et l'adresse de sa victime. L'intention vit 24 heures. La
 * victime se connecte normalement dans l'intervalle, `/auth/confirm` consomme
 * l'intention AVANT `claimInvitation` — et la voila proprietaire d'une
 * entreprise arbitraire. Le degat n'est pas passager : `claimInvitation`
 * renonce des qu'une appartenance active existe, donc l'invitation legitime de
 * son employeur ne sera PLUS JAMAIS reclamee. Un deni d'acces durable, monte
 * par quelqu'un qui connait seulement une adresse.
 *
 * D'ou la regle : **on n'honore une intention que si le compte est ne apres
 * elle**. C'est exactement l'ordre du parcours legitime — l'intention, puis le
 * lien, puis le compte cree par `verifyOtp`. Dans l'attaque, le compte de la
 * victime preexiste, et l'intention tombe.
 *
 * La condition est un PREDICAT SQL, pas un test JavaScript, meme discipline que
 * `claimRequester` : elle doit tenir dans le meme `DELETE ... RETURNING` que la
 * consommation, sans quoi deux appels concurrents la contourneraient.
 */
export async function consumeIntent(
  rawEmail: string,
  accountCreatedAt: Date,
  now = new Date(),
): Promise<Intent | null> {
  const email = normalizeEmail(rawEmail)

  const [row] = await db
    .delete(registrationIntent)
    .where(
      and(
        eq(registrationIntent.email, email),
        gte(registrationIntent.createdAt, new Date(now.getTime() - RETENTION_MS)),
        lte(registrationIntent.createdAt, new Date(accountCreatedAt.getTime() + CLOCK_SKEW_MS)),
      ),
    )
    .returning()

  return row ? { kind: row.kind, siret: row.siret, name: row.name } : null
}
