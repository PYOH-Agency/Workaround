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

export type Destination =
  | '/'
  | '/mes-logements'
  | '/mon-repertoire'
  | '/supervision'
  | '/creer-mon-entreprise'

/**
 * Ou envoyer un compte qui vient de se connecter.
 *
 * **L'entreprise l'emporte** : un meme compte peut porter plusieurs roles — un
 * plombier fait aussi refaire sa toiture, et l'exploitant du produit est a la
 * fois artisan d'essai et relecteur. L'accueil est celui ou l'on travaille tous
 * les jours ; l'en-tete propose le passage a l'autre cote.
 *
 * L'artisan atterrit sur la RACINE, qui lui sert son accueil la ou elle sert la
 * landing au visiteur. Envoyer sur `/devis` le posait devant une liste vide le
 * jour de son inscription, alors que la mise en route a des gestes a lui
 * proposer.
 *
 * `hasSignature` distingue le demandeur ne d'une signature de celui venu de
 * lui-meme. Sans lui, l'inscription autonome atterrirait sur `/mes-logements`,
 * que `myProperties` derive DES SIGNATURES — donc un ecran vide, et
 * structurellement incapable de se remplir.
 *
 * Le repli n'est plus le formulaire SIRET nu : c'est la porte d'inscription
 * artisan, qui explique ce qu'elle est a qui n'est pas artisan.
 */
export function resolveDestination(input: {
  hasCompany: boolean
  hasRequester: boolean
  hasSignature: boolean
  hasStaff: boolean
}): Destination {
  if (input.hasCompany) return '/'
  if (input.hasRequester) return input.hasSignature ? '/mes-logements' : '/mon-repertoire'
  if (input.hasStaff) return '/supervision'
  return '/creer-mon-entreprise'
}
