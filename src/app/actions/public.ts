'use server'

import { redirect } from 'next/navigation'
import { parseSiretInput } from '@/domain/siret'
import { publicProfile } from '@/services/public-profile'

export interface LookupState {
  error?: string
}

/**
 * Redirige vers le passeport public d'une entreprise.
 *
 * **Une entreprise introuvable et une entreprise sans activite couverte
 * recoivent le meme message.** `publicProfile` renvoyant `null` dans les deux
 * cas, l'indistinction est acquise par construction : il ne faut surtout pas
 * l'affiner, sinon le formulaire devient un test d'existence.
 */
export async function lookupCompany(
  _state: LookupState,
  form: FormData,
): Promise<LookupState> {
  const parsed = parseSiretInput(String(form.get('siret') ?? ''))
  if ('error' in parsed) return { error: parsed.error }

  const profile = await publicProfile(parsed.siren, new Date())
  if (!profile) {
    return { error: 'Cette entreprise n’a pas encore de page publique sur D’équerre.' }
  }

  // `redirect` leve : jamais dans un try/catch.
  redirect(`/artisan/${profile.slug}`)
}
