import { redirect } from 'next/navigation'
import { and, eq, isNull } from 'drizzle-orm'
import type { EmailOtpType } from '@supabase/supabase-js'
import { db } from '@/db/client'
import { member } from '@/db/schema'
import { resolveDestination } from '@/domain/requester'
import { claimInvitation } from '@/services/membership'
import { claimRequester } from '@/services/requesters'
import { createServerSupabase } from '@/lib/supabase-server'

/**
 * Point d'atterrissage du lien magique.
 *
 * Echange le jeton contre une session, puis oriente **selon le role**. Envoyer
 * tout le monde vers l'atelier faisait atterrir un client sur le formulaire
 * SIRET de l'artisan.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // La connexion est aussi le moment ou une invitation rencontre enfin un
      // compte. **Avant** la lecture de l'appartenance, sans quoi celui qui
      // vient de rejoindre serait envoye au formulaire SIRET de l'inscription.
      if (user?.email) await claimInvitation(user.id, user.email).catch(() => null)

      const [company, account] = await Promise.all([
        // `removed_at IS NULL`, comme dans la session : un membre retire n'a
        // plus d'entreprise, et l'envoyer vers l'atelier ne ferait que reporter
        // le refus d'un ecran.
        user
          ? db.query.member.findFirst({
              where: and(eq(member.userId, user.id), isNull(member.removedAt)),
            })
          : undefined,
        // La connexion est le moment ou le dossier cree par la signature
        // rencontre enfin un compte : c'est ici qu'il se rattache.
        //
        // **Hors du chemin critique.** Un echec ici ne doit pas empecher de se
        // connecter : la route sert les DEUX publics, et un incident sur le
        // dossier d'un client verrouillerait aussi l'atelier des artisans. Le
        // rattachement se rejoue de toute facon a chaque lecture de session.
        user?.email ? claimRequester(user.id, user.email).catch(() => null) : null,
      ])

      // Hors du bloc `try` : `redirect` signale la navigation en levant une
      // exception, qu'un `catch` afficherait comme une erreur.
      redirect(
        resolveDestination({
          hasCompany: company !== undefined && company !== null,
          hasRequester: account !== null,
        }),
      )
    }
  }

  redirect('/connexion?erreur=lien_invalide')
}
