import { redirect } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { creerClientServeur } from '@/lib/supabase-serveur'

/**
 * Point d'atterrissage du lien magique. Echange le jeton contre une session,
 * puis oriente : vers l'inscription si l'utilisateur n'a pas encore
 * d'entreprise, vers les devis sinon.
 */
export async function GET(requete: Request) {
  const url = new URL(requete.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await creerClientServeur()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) redirect('/devis')
  }

  redirect('/connexion?erreur=lien_invalide')
}
