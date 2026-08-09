'use server'

import { revalidatePath } from 'next/cache'
import { arbitrate } from '@/services/disputes'

export interface ArbitrationState {
  error?: string
}

/**
 * La reponse du client.
 *
 * Aucune identification supplementaire : le jeton fait office d'autorisation,
 * comme le lien de devis de M1. L'enjeu est une metrique, pas un contrat — et
 * une contestation abusive se voit d'elle-meme, puisqu'elle fait baisser le
 * volume affiche a cote du taux.
 */
export async function answerDispute(
  token: string,
  _state: ArbitrationState,
  form: FormData,
): Promise<ArbitrationState> {
  const verdict = String(form.get('verdict'))
  if (verdict !== 'upheld' && verdict !== 'rejected') return { error: 'Réponse invalide.' }

  try {
    await arbitrate(token, verdict, new Date())
  } catch {
    // Le declencheur de la base refuse un second arbitrage : le message brut de
    // PostgreSQL n'a rien a faire devant un particulier.
    return { error: 'Cette question a déjà reçu une réponse.' }
  }

  revalidatePath(`/c/${token}`)
  return {}
}
