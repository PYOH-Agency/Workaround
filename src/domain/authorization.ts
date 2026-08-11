/**
 * Qui peut quoi.
 *
 * **Une seule table, lue par tout le monde** : les actions serveur, les pages,
 * et la navigation. Deux tables — une pour la garde, une pour l'affichage —
 * divergeraient en trois jalons, et l'ecran finirait par proposer ce que le
 * serveur refuse.
 *
 * Deux axes INDEPENDANTS, et il faut qu'ils le restent :
 * - le **plan** dit ce que l'entreprise a paye ;
 * - le **role** dit ce que cette personne-la fait dans l'entreprise.
 *
 * Les confondre donnerait « le compagnon d'une entreprise Pro peut facturer »,
 * ce qui est exactement l'inverse du besoin.
 */

export type Plan = 'free' | 'pro'
export type Role = 'owner' | 'member'

export interface Access {
  plan: Plan
  role: Role
}

/** `owner` CONTIENT `member` : un rang superieur possede tout le rang inferieur. */
const RANK: Record<Role, number> = { member: 0, owner: 1 }

interface Requirement {
  /** Le plan MINIMUM. */
  plan: Plan
  /** Le role MINIMUM. */
  role: Role
  /** Ce qui est refuse, sous forme de verbe. Sert au message. */
  label: string
}

/**
 * Ce que chaque capacite exige.
 *
 * **Ce qui porte `plan: 'pro'` sort du gratuit.** La spec l'ecrit sans
 * exception : le capteur — devis, facture, passeport, agenda, espace demandeur
 * — reste gratuit a vie. Un test dedie verifie que cette liste ne compte
 * qu'une entree, et il echouera au premier ajout distrait.
 */
export const CAPABILITIES = {
  'quote.read': { plan: 'free', role: 'member', label: 'consulter les devis' },
  'quote.write': { plan: 'free', role: 'owner', label: 'établir un devis' },
  'invoice.issue': { plan: 'free', role: 'owner', label: 'facturer' },
  'payment.record': { plan: 'free', role: 'owner', label: 'enregistrer un paiement' },
  'passport.manage': { plan: 'free', role: 'owner', label: 'consulter et défendre le passeport' },
  'legal.write': { plan: 'free', role: 'owner', label: 'modifier les informations de l’entreprise' },
  'agenda.manage': { plan: 'free', role: 'member', label: 'tenir l’agenda' },
  'agenda.sync': { plan: 'free', role: 'owner', label: 'raccorder un agenda extérieur' },
  'chantier.post': { plan: 'free', role: 'member', label: 'publier au fil de chantier' },
  'chantier.complete': { plan: 'free', role: 'owner', label: 'déclarer la fin d’un chantier' },
  'team.manage': { plan: 'pro', role: 'owner', label: 'gérer l’équipe' },
  'situation.issue': {
    plan: 'pro',
    role: 'owner',
    label: 'établir une situation de travaux',
  },
} as const satisfies Record<string, Requirement>

export type Capability = keyof typeof CAPABILITIES

/** Ce qui manque. Les deux appellent des reponses tres differentes. */
export type Denial = 'plan' | 'role'

export class AccessError extends Error {
  constructor(
    readonly reason: Denial,
    message: string,
  ) {
    super(message)
  }
}

/**
 * Ce qui manque pour cette capacite, ou `null` si rien ne manque.
 *
 * **Le role est examine AVANT le plan.** Si les deux manquent, c'est le role
 * qu'on annonce : dire « offre Pro » a un compagnon lui vendrait quelque chose
 * dont il ne pourrait de toute facon rien faire. Un refus insurmontable prime
 * sur un refus commercial.
 */
export function denial(access: Access, capability: Capability): Denial | null {
  const required: Requirement = CAPABILITIES[capability]

  if (RANK[access.role] < RANK[required.role]) return 'role'
  if (required.plan === 'pro' && access.plan !== 'pro') return 'plan'

  return null
}

/**
 * La forme qui sert a l'affichage : la meme question qu'`assertCan`, en booleen,
 * pour ce qui masque une entree au lieu de la refuser une fois cliquee.
 *
 * A tolere `undefined` tant que le backoffice partageait l'en-tete de
 * l'artisan ; il a desormais `AdminShell`, et plus aucun appelant n'ignore a
 * qui il demande.
 */
export function can(access: Access, capability: Capability): boolean {
  return denial(access, capability) === null
}

/** La forme qui garde. Leve une `AccessError` porteuse de sa raison. */
export function assertCan(access: Access, capability: Capability): void {
  const missing = denial(access, capability)
  if (!missing) return

  throw new AccessError(
    missing,
    missing === 'plan'
      ? 'Cette fonction fait partie de l’offre Pro.'
      : `Seul le responsable de l’entreprise peut ${CAPABILITIES[capability].label}.`,
  )
}
