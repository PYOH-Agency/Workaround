'use server'

import { redirect } from 'next/navigation'
import { parseSiretInput } from '@/domain/siret'
import type { LookupEntry } from '@/domain/lead'
import { classifySiret, recordLookup } from '@/services/verification-lookup'
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
 * Redirige vers ce qu'on sait dire d'une entreprise.
 *
 * **Un inscrit sans activite couverte et un inconnu recoivent la meme page.**
 * L'indistinction etait acquise par le `null` de `publicProfile` ; elle est
 * desormais acquise par une redirection commune. Elle n'a pas change de nature,
 * seulement de branche — et il ne faut surtout pas l'affiner, sinon le
 * formulaire devient un test d'appartenance a D'equerre.
 */
export async function lookupCompany(
  _state: LookupState,
  form: FormData,
): Promise<LookupState> {
  const parsed = parseSiretInput(String(form.get('siret') ?? ''))
  if ('error' in parsed) return { error: parsed.error }

  const entry: LookupEntry = form.get('entry') === 'pro' ? 'pro' : 'demandeur'
  const now = new Date()

  const { outcome, slug } = await classifySiret(parsed.siret, now)
  await recordLookup({ siret: parsed.siret, outcome, entry }, now)

  // `redirect` leve : jamais dans un try/catch.
  redirect(outcome === 'covered' && slug ? `/artisan/${slug}` : `/verification/${parsed.siret}`)
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
