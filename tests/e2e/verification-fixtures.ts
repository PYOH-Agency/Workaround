import { type Page } from '@playwright/test'

/**
 * Le decor du parcours de verification.
 *
 * Extrait du fichier de test pour tenir sous la limite de 250 lignes que
 * `check:size` impose. Les commentaires portent le raisonnement des choix —
 * pourquoi ces SIRET, pourquoi ces mots et pas d'autres — et les couper aurait
 * laisse le test lisible mais ses choix inexplicables.
 */

/**
 * Cle de Luhn valide, absent de `supabase/seed.sql` et de tous les autres
 * parcours (`grep` fait). Le SIREN 987 654 321 n'est attribue a personne : le
 * repertoire public repondra « inconnu », et jamais une identite reelle qui
 * changerait sous nos pieds.
 */
export const UNKNOWN_SIRET = '98765432100007'

/** Le meme numero, cle fausse. */
export const BAD_KEY_SIRET = '98765432100013'

/**
 * Une entreprise du seed, donc inscrite chez nous. Elle sert a une seule
 * chose : verifier qu'elle lit exactement le meme ecran qu'un inconnu.
 */
export const MEMBER_SIRET = '50769820700036'

export const REQUESTER_NAME = 'Camille'
export const REQUESTER_EMAIL = 'demandeur-verification@test.local'
export const ARTISAN_EMAIL = 'artisan-verification@test.local'

/**
 * Le vocabulaire qui rassure, et que cette page n'a pas le droit d'employer.
 *
 * **Formulation deliberee.** Une comparaison mot a mot du texte de la page
 * serait fausse le jour ou une virgule bouge ; une simple absence de coche
 * verte ne prouverait rien, puisqu'un « entreprise active » en texte brut
 * rassure tout autant. Le test tient donc les deux bouts :
 *
 * — cette liste ne contient QUE des termes dont l'apparition serait, en soi,
 *   la regression : un statut administratif favorable (`actif`, `en règle`,
 *   `à jour`), un label repris d'un tiers (`RGE`, `certifié`, `qualifié`), ou
 *   un jugement (`fiable`, `de confiance`, `score`, `note`). Aucun n'est un
 *   mot que la page pourrait employer innocemment ;
 * — les mots que la page emploie legitimement — `assurance`, `garantie`,
 *   `vérifiée`, `activité` — en sont volontairement absents : les y mettre
 *   ferait echouer le test sur du texte juste, et la premiere reaction serait
 *   de retoucher la page.
 *
 * Les bornes `\b` evitent les faux positifs par sous-chaine (`actif` dans
 * `actifs`, `note` dans `notez`) ; les racines sans borne finale — `certifi`,
 * `qualifi` — attrapent au contraire toutes les flexions.
 */
export const REASSURING = [
  /\bRGE\b/,
  /\bactif\b/i,
  /\bactive\b/i,
  /certifi/i,
  /qualifi/i,
  /\bconforme/i,
  /à jour/i,
  /en règle/i,
  /fiable/i,
  /de confiance/i,
  /\bscore\b/i,
  /\bnote\b/i,
]

/**
 * Le vocabulaire de l'appartenance, interdit dans les deux sens.
 *
 * Dire « cette entreprise n'est pas inscrite chez nous » revelerait une
 * appartenance a n'importe quel tiers muni d'un SIRET. Le dire a l'envers
 * aussi. C'est ce que `tests/services/verification-indistinction.test.ts`
 * verrouille cote service ; ici on le verifie sur l'ecran rendu.
 */
export const MEMBERSHIP = [/inscrit/i, /adhér/i, /notre client/i, /chez nous/i, /membre/i]

export async function pageText(page: Page): Promise<string> {
  return (await page.locator('body').innerText()).replace(/ /g, ' ')
}
