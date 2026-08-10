import { redirect } from 'next/navigation'
import { and, eq, isNull } from 'drizzle-orm'
import type { EmailOtpType } from '@supabase/supabase-js'
import { db } from '@/db/client'
import { member, signature, staff } from '@/db/schema'
import { resolveDestination } from '@/domain/requester'
import { claimInvitation } from '@/services/membership'
import { consumeIntent } from '@/services/registration-intent'
import { createCompanyFor, RegistrationError } from '@/services/registration'
import { claimRequester, requesterFromSignUp } from '@/services/requesters'
import { createServerSupabase } from '@/lib/supabase-server'

/**
 * Point d'atterrissage du lien magique.
 *
 * Echange le jeton contre une session, **consomme l'intention d'inscription**,
 * puis oriente selon le role. Envoyer tout le monde vers l'atelier faisait
 * atterrir un client sur le formulaire SIRET de l'artisan.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  if (!tokenHash || !type) redirect('/connexion?erreur=lien_invalide')

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) redirect('/connexion?erreur=lien_invalide')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) redirect('/connexion?erreur=lien_invalide')

  // L'intention d'abord : c'est elle qui peut CREER le rattachement que les
  // lectures qui suivent vont chercher.
  const intent = await consumeIntent(user.email)

  if (intent?.kind === 'company' && intent.siret) {
    try {
      await createCompanyFor(user.id, user.email, intent.siret)
    } catch (e) {
      // Etablissement cesse entre la saisie et l'ouverture du courriel, ou
      // entreprise inscrite entre-temps par quelqu'un d'autre. Le compte
      // existe : on le renvoie sur la porte, qui redira pourquoi.
      if (!(e instanceof RegistrationError)) throw e
      redirect('/creer-mon-entreprise?erreur=indisponible')
    }
  }

  if (intent?.kind === 'requester' && intent.name) {
    await requesterFromSignUp({ email: user.email, name: intent.name })
  }

  // La connexion est aussi le moment ou une invitation rencontre enfin un
  // compte. **Avant** la lecture de l'appartenance, sans quoi celui qui vient
  // de rejoindre serait envoye au formulaire SIRET de l'inscription.
  await claimInvitation(user.id, user.email).catch(() => null)

  const [company, account, internal] = await Promise.all([
    // `removed_at IS NULL`, comme dans la session : un membre retire n'a plus
    // d'entreprise, et l'envoyer vers l'atelier ne ferait que reporter le refus
    // d'un ecran.
    db.query.member.findFirst({
      where: and(eq(member.userId, user.id), isNull(member.removedAt)),
    }),
    // La connexion est le moment ou le dossier cree par la signature rencontre
    // enfin un compte : c'est ici qu'il se rattache.
    //
    // **Hors du chemin critique.** Un echec ici ne doit pas empecher de se
    // connecter : la route sert les trois publics, et un incident sur le
    // dossier d'un client verrouillerait aussi l'atelier des artisans. Le
    // rattachement se rejoue de toute facon a chaque lecture de session.
    claimRequester(user.id, user.email).catch(() => null),
    db.query.staff.findFirst({ where: eq(staff.userId, user.id) }),
  ])

  // Une signature, donc un logement a montrer. Sans elle, `/mes-logements` est
  // un ecran vide que sa requete ne peut pas remplir.
  const signed = account
    ? await db.query.signature.findFirst({ where: eq(signature.requesterId, account.id) })
    : undefined

  // Hors de tout bloc `try` : `redirect` signale la navigation en levant une
  // exception, qu'un `catch` afficherait comme une erreur.
  redirect(
    resolveDestination({
      hasCompany: Boolean(company),
      hasRequester: Boolean(account),
      hasSignature: Boolean(signed),
      hasStaff: Boolean(internal),
    }),
  )
}
