'use server'

import { revalidatePath } from 'next/cache'
import type { GuardVerdict } from '@/domain/lead-guards'
import { currentStaff } from '@/lib/staff-session'
import { relaunchRequest } from '@/services/attestation-request'

export interface RelaunchState {
  message?: string
}

/**
 * Le verdict, dit tel quel — l'inverse exact de `requestAttestation`.
 *
 * La page publique masque tous les refus derriere un message unique : y
 * distinguer une treve d'une opposition revelerait au demandeur des
 * informations sur un tiers. Ici le lecteur est un relecteur de chez nous. Il
 * doit savoir pourquoi rien n'est parti — sans quoi il recliquera, ou croira a
 * une panne — et il n'apprend rien qu'il ne puisse deja lire en base.
 *
 * `already_requested` couvre deux realites, et sa formulation doit rester vraie
 * des deux cotes : la demande de moins de vingt-quatre heures, et la ligne qui
 * n'a plus — ou n'a jamais eu — de contact a relancer.
 */
const MESSAGES: Record<GuardVerdict, string> = {
  ok: 'Relance envoyée.',
  opted_out: 'Rien n’envoyé : cet artisan a demandé à ne plus être contacté.',
  artisan_cooldown: 'Rien n’envoyé : cet artisan a déjà été sollicité il y a moins de sept jours.',
  already_requested:
    'Rien n’envoyé : cette demande a déjà eu lieu — relancée il y a moins de vingt-quatre heures, ou vidée de ses contacts.',
  requester_flooded: 'Rien n’envoyé : ce demandeur a dépassé trois demandes dans l’heure.',
}

/**
 * Relance une demande, depuis la liste.
 *
 * `relaunchRequest` leve sur un identifiant inconnu, et rien ne le rattrape
 * ici : le bouton n'est propose que sur des lignes lues en base, donc un
 * identifiant introuvable vient d'une requete forgee. Le traduire en message
 * le ferait passer pour un refus ordinaire.
 *
 * Aucun `FormData` en parametre : le formulaire ne porte rien d'autre que le
 * geste, et l'identifiant vient de la liaison faite a l'appel.
 */
export async function relaunch(id: string, _state: RelaunchState): Promise<RelaunchState> {
  await currentStaff()

  const verdict = await relaunchRequest(id, new Date())

  // Meme sur un refus : une autre relance a pu aboutir entre-temps, et la liste
  // affichee daterait alors d'avant elle.
  revalidatePath('/leads')

  return { message: MESSAGES[verdict] }
}
