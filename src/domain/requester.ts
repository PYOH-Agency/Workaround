/**
 * Le demandeur : la personne qui signe, regle, et consulte son dossier.
 *
 * Elle n'est pas le `customer` d'une entreprise — celui-la appartient a
 * l'entreprise et n'est jamais partage. Le demandeur traverse les entreprises,
 * et c'est ce qui rend possible la vue consolidee de son logement.
 */

/**
 * Une adresse normalisee, et rien d'autre comme cle d'identite.
 *
 * `Paul@Test.fr` et `paul@test.fr` sont la meme personne. Sans cette
 * normalisation, la seconde signature creerait un second compte, qui ne verrait
 * jamais le premier chantier — et le defaut serait invisible jusqu'a ce qu'un
 * client s'en plaigne.
 */
export function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) throw new Error('Adresse électronique manquante')
  return trimmed
}

export type Destination = '/' | '/mes-logements' | '/inscription'

/**
 * Ou envoyer un compte qui vient de se connecter.
 *
 * **L'entreprise l'emporte** : un meme compte peut porter les deux roles — un
 * plombier fait aussi refaire sa toiture — et l'atelier est celui ou l'on
 * travaille tous les jours. L'en-tete propose le passage a l'autre cote.
 */
export function resolveDestination(input: {
  hasCompany: boolean
  hasRequester: boolean
}): Destination {
  if (input.hasCompany) return '/'
  if (input.hasRequester) return '/mes-logements'
  return '/inscription'
}
