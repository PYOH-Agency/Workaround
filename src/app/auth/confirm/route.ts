import { redirect } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase-server'

/**
 * Point d'atterrissage du lien magique. Echange le jeton contre une session,
 * puis oriente vers l'espace entreprise.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) redirect('/devis')
  }

  redirect('/connexion?erreur=lien_invalide')
}
