'use server'

import { invitationAwaits } from '@/services/membership'

/**
 * Une invitation en attente vaut autorisation de creer le compte : c'est le
 * seul cas ou la porte de retour en cree un. Sans cela, le compagnon invite
 * n'a AUCUN chemin d'entree — `claimInvitation` exige un compte, et aucune
 * porte d'inscription ne lui convient : celle de l'artisan creerait une
 * entreprise concurrente, celle du particulier un dossier de demandeur.
 *
 * La lecture vit dans `services/membership`, aupres de `claimInvitation` qui
 * porte la meme condition : ici, elle ne serait pas testable.
 */
export async function invitationPending(email: string): Promise<boolean> {
  return invitationAwaits(email)
}
