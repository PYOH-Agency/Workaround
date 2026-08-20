'use server'

import { redirect } from 'next/navigation'
import { recordIntent } from '@/services/registration-intent'
import { requesterFromSignUp } from '@/services/requesters'
import { createServerSupabase } from '@/lib/supabase-server'

export interface SignUpState {
  error?: string
  /**
   * Vrai quand il reste un lien a envoyer.
   *
   * Faux quand la personne etait deja connectee : son dossier est cree et la
   * redirection est deja partie, il n'y a rien a poster.
   */
  sendLink?: boolean
}

/**
 * Deux publics ici aussi, comme sur la porte artisan.
 *
 * **Anonyme** : on ecrit l'intention et rien d'autre. La ligne `requester` naitra
 * a l'atterrissage — la creer maintenant la laisserait orpheline pour chaque
 * adresse saisie puis abandonnee, exactement le defaut qu'on corrige sur
 * `/connexion`.
 *
 * **Deja connecte** : on cree le dossier tout de suite. L'adresse est prouvee
 * par la session, il n'y a aucune intention a memoriser — et surtout, sans cette
 * branche le compte est PIEGE. `resolveDestination` envoie un compte sans
 * dossier vers la porte artisan ; s'il revient ici, `consumeIntent` refusera son
 * intention, qui serait datee d'apres son compte. Il tournerait en rond
 * indefiniment, sans qu'aucun ecran ne lui dise pourquoi.
 *
 * Le cas se produit des qu'un `requesterFromSignUp` echoue a l'atterrissage —
 * un incident de base suffit, et `/auth/confirm` l'avale a dessein pour ne pas
 * verrouiller l'atelier des artisans du meme coup.
 */
export async function recordRequesterIntent(
  _state: SignUpState,
  form: FormData,
): Promise<SignUpState> {
  const email = String(form.get('email') ?? '').trim()
  const name = String(form.get('name') ?? '').trim()

  if (!name) return { error: 'Votre nom est obligatoire.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Adresse e-mail invalide.' }

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    // Son adresse, jamais celle du formulaire : celle-ci n'est pas prouvee, et
    // la retenir laisserait rattacher un dossier a l'adresse d'autrui.
    await requesterFromSignUp({ email: user.email, name })

    // Hors de tout bloc `try` : `redirect` signale la navigation en levant.
    redirect('/mon-repertoire')
  }

  await recordIntent({ email, kind: 'requester', name })
  return { sendLink: true }
}
