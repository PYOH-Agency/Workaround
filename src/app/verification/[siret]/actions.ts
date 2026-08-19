'use server'

import type { RequestChannel } from '@/domain/lead'
import { isValidSiret } from '@/domain/siret'
import { createRequest } from '@/services/attestation-request'

/**
 * Les fautes de saisie sont nommees champ par champ ; le succes, lui, n'a
 * qu'une seule forme. C'est cette asymetrie qui porte toute la regle de ce
 * fichier — voir le docblock de `requestAttestation`.
 */
export interface RequestState {
  sent?: boolean
  errors?: {
    siret?: string
    requesterName?: string
    requesterEmail?: string
    artisanEmail?: string
  }
}

/** Le meme controle que `requestQuoteLink` : la validite reelle, seul le serveur d'en face la connait. */
function looksLikeEmail(value: string): boolean {
  return value.includes('@') && !/\s/.test(value)
}

/**
 * Reclame l'attestation a l'entreprise, par l'un des deux chemins.
 *
 * **La reponse est toujours la meme, que la demande soit partie ou refusee.**
 * `createRequest` rend un verdict detaille — `opted_out`, `artisan_cooldown`,
 * `already_requested`, `requester_flooded` — et cette action l'IGNORE
 * volontairement. Le verdict existe pour l'ecran d'admin, qui a le droit de
 * savoir ; le demandeur, non :
 *
 * - un refus par treve de sept jours revelerait qu'un autre demandeur a ecrit
 *   a cette entreprise avant lui ;
 * - un refus par opposition revelerait que l'artisan nous a demande de ne plus
 *   le contacter.
 *
 * Les deux sont des informations sur un tiers, obtenues par la seule saisie
 * d'un SIRET et d'une adresse. Les afficher ferait de ce formulaire une sonde :
 * « cette entreprise est-elle deja sollicitee ? », « a-t-elle refuse nos
 * messages ? ». Exactement le piege que la page entiere refuse par ailleurs.
 *
 * **Ce fichier est celui ou quelqu'un sera tente d'« ameliorer le retour
 * utilisateur »** en affichant le vrai refus. C'est une regression, pas un
 * enrichissement, et `tests/services/request-attestation.test.ts` la fait
 * echouer : il compare l'etat rendu sur un refus reel a celui d'un succes, et
 * exige qu'ils soient identiques.
 *
 * **Seules les fautes de saisie du demandeur produisent un message different.**
 * Lui seul les a commises, lui seul peut les corriger, et elles ne disent rien
 * de personne d'autre.
 *
 * Le try/catch suit la meme logique que `requestQuoteLink` : une panne base ou
 * SMTP ne doit pas se traduire par une reponse differente de celle d'un refus.
 * Elle serait de surcroit un mauvais conseil — `createRequest` ecrit la ligne
 * AVANT d'envoyer, donc une panne en aval laisse la demande enregistree, et la
 * relance a laquelle un message d'erreur inviterait serait refusee en silence
 * par la garde des vingt-quatre heures.
 */
export async function requestAttestation(
  _state: RequestState,
  form: FormData,
): Promise<RequestState> {
  const siret = String(form.get('siret') ?? '').trim()
  // Le SIRET vient d'un champ cache, pas de la frappe : une valeur fausse ici
  // est une page truquee, pas une faute d'inattention. On refuse sans rien
  // ecrire, comme `createRequest` refuserait — en le laissant lever.
  if (!isValidSiret(siret)) {
    return { errors: { siret: 'Ce numéro SIRET n’est pas valide.' } }
  }

  const channel: RequestChannel = form.get('channel') === 'copied' ? 'copied' : 'sent'
  const now = new Date()

  if (channel === 'copied') {
    // Le demandeur transmet lui-meme : aucun contact ne nous est confie, et il
    // n'y a donc rien a valider. Seule l'intention est enregistree.
    try {
      await createRequest({ siret, channel: 'copied', notify: false }, now)
    } catch {
      // L'entonnoir perd une ligne ; le demandeur, lui, a son message.
    }
    return { sent: true }
  }

  const requesterName = String(form.get('requesterName') ?? '').trim()
  const requesterEmail = String(form.get('requesterEmail') ?? '').trim()
  const artisanEmail = String(form.get('artisanEmail') ?? '').trim()

  const errors: NonNullable<RequestState['errors']> = {}
  if (!requesterName) errors.requesterName = 'Indiquez votre prénom.'
  if (!looksLikeEmail(requesterEmail)) errors.requesterEmail = 'Cette adresse ne semble pas valide.'
  if (!looksLikeEmail(artisanEmail)) {
    errors.artisanEmail = 'Cette adresse ne semble pas valide.'
  }
  if (Object.keys(errors).length > 0) return { errors }

  try {
    // Le verdict rendu ici n'est jamais lu, et ce n'est pas un oubli : voir
    // ci-dessus. Le nommer pour l'ignorer serait deja une invitation a s'en
    // servir.
    await createRequest(
      {
        siret,
        channel: 'sent',
        // Absente du formulaire, la case decochee ne renvoie rien.
        notify: form.get('notify') !== null,
        requesterName,
        requesterEmail,
        artisanEmail,
      },
      now,
    )
  } catch {
    // Defense en profondeur : la reponse reste celle d'un refus.
  }

  return { sent: true }
}
