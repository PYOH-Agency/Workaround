'use server'

import { redirect } from 'next/navigation'
import { parseSiretInput } from '@/domain/siret'
import { publicProfile } from '@/services/public-profile'
import { resendQuoteLinks } from '@/services/quote-link'

/**
 * Verification par SIRET — couche partagee, et non fonctionnalite d'un ecran.
 *
 * `lookupCompany` sert la page d'accueil pro et la page d'accueil demandeur :
 * elle appartient donc aux deux, c'est-a-dire a aucune des deux. La
 * colocaliser avec l'une des routes obligerait l'autre a en dependre, et les
 * deux cesseraient d'etre autonomes.
 */
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

export interface QuoteLinkState {
  sent?: boolean
  error?: string
}

/**
 * Renvoie le lien d'un devis a l'adresse a laquelle il a ete adresse.
 *
 * **La reponse est toujours la meme**, qu'un devis existe ou non, que la
 * limitation ait joue ou non, et meme si `resendQuoteLinks` echoue (base ou
 * SMTP indisponible) : le try/catch est une defense en profondeur, le service
 * avale deja ses erreurs internes, mais une panne non prevue ici ne doit pas
 * se traduire par une reponse differente de celle d'une adresse inconnue.
 * Sans cela le formulaire devient un test d'existence d'adresse. Le lien
 * n'est jamais affiche, uniquement envoye.
 *
 * Le message affiche vit dans `./public-messages` et non ici : un fichier
 * marque `'use server'` ne peut exporter que des fonctions async (regle
 * React, verifiee a l'execution par ce Next.js), et une chaine constante ne
 * l'est pas.
 */
export async function requestQuoteLink(
  _state: QuoteLinkState,
  form: FormData,
): Promise<QuoteLinkState> {
  const email = String(form.get('email') ?? '').trim()

  if (!email.includes('@')) {
    return { error: 'Cette adresse ne semble pas valide.' }
  }

  try {
    await resendQuoteLinks(email, new Date())
  } catch {
    // Panne base ou SMTP en amont du service : la reponse reste neutre.
  }

  return { sent: true }
}
