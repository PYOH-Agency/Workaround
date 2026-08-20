'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'

/**
 * La deconnexion — couche partagee, comme l'emission de factures.
 *
 * Les trois coquilles s'en servent : la laisser dans l'une obligerait les deux
 * autres a en dependre, et aucune ne serait plus autonome.
 *
 * Ce manque etait le plus expose du systeme : la signature se fait souvent sur
 * le telephone de l'artisan, chez le client. Sans sortie, la session du client
 * y survit.
 */
export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()

  // Hors du bloc precedent : `redirect` signale la navigation en levant.
  redirect('/')
}
