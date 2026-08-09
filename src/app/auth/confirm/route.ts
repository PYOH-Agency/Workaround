import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import type { EmailOtpType } from '@supabase/supabase-js'
import { db } from '@/db/client'
import { member } from '@/db/schema'
import { resolveDestination } from '@/domain/requester'
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

      const [company, account] = await Promise.all([
        user ? db.query.member.findFirst({ where: eq(member.userId, user.id) }) : undefined,
        // La connexion est le moment ou le dossier cree par la signature
        // rencontre enfin un compte : c'est ici qu'il se rattache.
        user?.email ? claimRequester(user.id, user.email) : null,
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
