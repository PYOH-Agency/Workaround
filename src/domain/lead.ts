/**
 * Le vocabulaire des leads, partage par la base, les services et l'admin.
 *
 * `outcome` n'a PAS de valeur « SIRET inconnu des registres » : le journal est
 * ecrit par `lookupCompany`, qui ne fait aucun appel reseau. L'absence au
 * repertoire est un etat d'affichage de la page, jamais une issue de recherche.
 */
export type LookupOutcome = 'covered' | 'uncovered_member' | 'stranger'

/** La page d'ou part la recherche : les deux publics ne se comportent pas pareil. */
export type LookupEntry = 'pro' | 'demandeur'

/**
 * `sent` — nous envoyons le mail. `copied` — le demandeur transmet lui-meme,
 * et nous n'enregistrons alors que l'intention : aucun contact, aucun envoi.
 */
export type RequestChannel = 'sent' | 'copied'
