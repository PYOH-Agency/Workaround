import type { LookupOutcome, RequestChannel } from './lead'

export interface FunnelInput {
  lookups: { outcome: LookupOutcome }[]
  requests: {
    channel: RequestChannel
    registeredAt: Date | null
    depositedAt: Date | null
    coveredAt: Date | null
  }[]
}

export interface Funnel {
  lookups: number
  uncovered: number
  requests: number
  sent: number
  copied: number
  registered: number
  deposited: number
  covered: number
}

/**
 * L'entonnoir, calcule sur des lignes brutes.
 *
 * Il ne compte que des dates et des canaux — jamais un SIRET, jamais une
 * adresse. C'est ce qui le rend insensible a l'anonymisation a 30 jours : une
 * ligne videe de ses contacts continue de compter pour ce qu'elle a produit.
 *
 * Le taux qui compte n'est pas le dernier mais `uncovered -> requests` : il dit
 * si la page convainc. Les suivants mesurent le circuit de revue.
 *
 * Il compte donc ce qu'on lui donne, et c'est a l'appelant de ne lui donner que
 * des gestes de visiteurs : une relance declenchee depuis l'ecran d'admin ne
 * mesure pas la page mais notre activite, et `lead-metrics` l'ecarte avant
 * d'arriver ici. Lui faire porter ce tri lui demanderait de lire un lien entre
 * deux lignes — quelque chose qui n'est ni une date ni un canal.
 */
export function funnel(input: FunnelInput): Funnel {
  const count = <T>(rows: T[], keep: (row: T) => boolean) => rows.filter(keep).length

  return {
    lookups: input.lookups.length,
    uncovered: count(input.lookups, (l) => l.outcome !== 'covered'),
    requests: input.requests.length,
    sent: count(input.requests, (r) => r.channel === 'sent'),
    copied: count(input.requests, (r) => r.channel === 'copied'),
    registered: count(input.requests, (r) => r.registeredAt !== null),
    deposited: count(input.requests, (r) => r.depositedAt !== null),
    covered: count(input.requests, (r) => r.coveredAt !== null),
  }
}
