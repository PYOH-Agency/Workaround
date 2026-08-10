'use server'

import { recordIntent } from '@/services/registration-intent'

export interface SignUpState {
  error?: string
}

/**
 * Ecrit l'intention **et rien d'autre**.
 *
 * La ligne `requester` n'est creee qu'a l'atterrissage : la creer ici la
 * laisserait orpheline pour chaque adresse saisie puis abandonnee — c'est
 * exactement le defaut qu'on corrige sur `/connexion`.
 */
export async function recordRequesterIntent(
  _state: SignUpState,
  form: FormData,
): Promise<SignUpState> {
  const email = String(form.get('email') ?? '').trim()
  const name = String(form.get('name') ?? '').trim()

  if (!name) return { error: 'Votre nom est obligatoire.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Adresse e-mail invalide.' }

  await recordIntent({ email, kind: 'requester', name })
  return {}
}
