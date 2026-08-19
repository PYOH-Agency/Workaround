import { isRateLimited } from './rate-limit'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/**
 * Trois demandes par heure et par demandeur avant refus.
 *
 * Le chiffre freine un abus, pas une charge serveur : trois clics manuels
 * passent, un script qui mitraille les SIRET ne passe pas. Pari faute de
 * trafic reel, a revoir sur observation — comme `HOURLY_CONTACT_LIMIT` dans
 * `src/domain/throttle.ts`.
 */
const REQUESTER_WINDOW = HOUR
const REQUESTER_MAX = 3

/**
 * Une seule demande par couple demandeur-artisan et par jour avant refus.
 *
 * Vingt-quatre heures absorbent un double-clic, un onglet rouvert ou un
 * rechargement de page sans bloquer une vraie relance le lendemain — la duree
 * d'une session malheureuse, pas celle d'un interet reitere.
 */
const COUPLE_WINDOW = DAY
const COUPLE_MAX = 1

/**
 * Un seul mail par artisan tous les sept jours, tous demandeurs confondus.
 *
 * C'est la garde qui compte : sans elle, dix demandeurs d'un meme artisan
 * produisent dix mails, et nous aurions industrialise un harcelement.
 */
const ARTISAN_WINDOW = 7 * DAY
const ARTISAN_MAX = 1

export type GuardVerdict =
  | 'ok'
  | 'opted_out'
  | 'artisan_cooldown'
  | 'already_requested'
  | 'requester_flooded'

export interface GuardInput {
  now: Date
  /** Demandes de ce demandeur, toutes entreprises confondues. */
  requesterRequests: Date[]
  /** Demandes de ce demandeur sur CE SIRET. */
  coupleRequests: Date[]
  /** Mails deja partis vers cette adresse d'artisan. */
  artisanMails: Date[]
  optedOut: boolean
}

/**
 * Le verdict d'une demande, sans rien connaitre de la base.
 *
 * **L'ordre des controles est le message** : l'opposition passe avant tout, et
 * la protection de l'artisan avant celle de nos serveurs. Un refus mal nomme se
 * traduirait par une reprise de contact au prochain creneau.
 *
 * Fonction pure : elle ne memorise rien. Un verdict `ok` doit etre suivi de
 * l'enregistrement de la tentative par l'appelant — sans cette ecriture, les
 * trois fenetres restent vides pour toujours et les gardes ne freinent plus rien.
 */
export function guardVerdict(input: GuardInput): GuardVerdict {
  if (input.optedOut) return 'opted_out'

  if (isRateLimited(input.artisanMails, input.now, ARTISAN_WINDOW, ARTISAN_MAX)) {
    return 'artisan_cooldown'
  }
  if (isRateLimited(input.coupleRequests, input.now, COUPLE_WINDOW, COUPLE_MAX)) {
    return 'already_requested'
  }
  if (isRateLimited(input.requesterRequests, input.now, REQUESTER_WINDOW, REQUESTER_MAX)) {
    return 'requester_flooded'
  }
  return 'ok'
}
