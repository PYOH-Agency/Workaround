import type { Cents } from './money'
import { businessDaysSince } from './business-days'
import { NOTICE_DAYS } from './expiry'

/**
 * Les seuils de la file d'accueil, et rien d'autre.
 *
 * Fonctions pures prenant `now` en parametre : un seuil qui depend d'une
 * horloge implicite est intestable, et celui-la decide de ce qu'un artisan voit
 * en ouvrant son espace.
 */

const DAY = 86_400_000

/**
 * Sept jours OUVRES, et non sept jours.
 *
 * Un devis parti vendredi soir ne traine pas le lundi matin. Le seuil est assez
 * long pour ne pas harceler un particulier qui reflechit, assez court pour
 * qu'il se souvienne encore de la visite.
 */
export const FOLLOW_UP_BUSINESS_DAYS = 7

/** Sous ce delai, la validite du devis devient elle-meme le motif de relance. */
export const VALIDITY_ALERT_DAYS = 15

/** Un chantier fini le jeudi n'a pas a figurer sur l'accueil du vendredi. */
export const UNBILLED_BUSINESS_DAYS = 3

/** Le premier palier de preavis : la file s'ouvre quand le courrier part. */
export const RENEWAL_ALERT_DAYS = NOTICE_DAYS[0]

export type TaskKind = 'certificate' | 'overdue_invoice' | 'silent_quote' | 'unbilled_completion'

/**
 * L'ordre des natures, du cout d'inaction le plus lourd au plus leger.
 *
 * L'attestation d'abord : elle seule coupe la visibilite publique du passeport,
 * et son cout ne se rattrape pas.
 */
export const TASK_ORDER: readonly TaskKind[] = [
  'certificate',
  'overdue_invoice',
  'silent_quote',
  'unbilled_completion',
]

/**
 * Un delai, et le SENS dans lequel il se lit.
 *
 * Les deux sens ne se trient pas dans le meme ordre : sur un temps ecoule, le
 * plus grand nombre est le plus urgent ; sur un temps restant, c'est le plus
 * petit — et il devient negatif quand l'echeance est passee, donc plus urgent
 * encore. Un seul champ de jours melangeait les deux et classait l'attestation
 * la MOINS pressee en tete des attestations.
 */
export interface Delay {
  sense: 'elapsed' | 'remaining'
  days: number
}

export interface Task {
  kind: TaskKind
  id: string
  title: string
  detail: string
  /** `null` quand la ligne ne porte pas d'argent — une attestation, typiquement. */
  amountInclTax: Cents | null
  /** L'anciennete, ou le delai restant. Sert au tri et a l'affichage. */
  delay: Delay
  href: string
  /** Le verbe du bouton. « Relancer », « Facturer », « Deposer l'attestation ». */
  action: string
}

/**
 * `Math.ceil`, comme `noticesDue` dans `expiry.ts`.
 *
 * Avec un plancher, une attestation valable encore soixante jours et quinze
 * heures compterait soixante jours et entrerait dans la file un jour trop tot —
 * a rebours du palier de preavis, qui est la meme frontiere.
 */
function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / DAY)
}

/**
 * `quoteNeedsFollowUp` et non `quoteIsSilent` : deux motifs distincts menent
 * ici, et un devis remis avant-hier dont la validite expire dans trois jours
 * n'a rien de silencieux. Le nom doit couvrir les deux, sinon le point d'appel
 * croit ne tester que le silence.
 *
 * Un devis envoye qui n'a pas recu de reponse, ou dont la validite s'acheve.
 *
 * Un devis DEJA expire n'y figure plus : il appelle un nouveau devis, pas une
 * relance, et ce n'est pas la meme conversation.
 */
export function quoteNeedsFollowUp(input: { sentAt: Date; validityDays: number }, now: Date): boolean {
  const expiresAt = new Date(input.sentAt.getTime() + input.validityDays * DAY)
  if (now.getTime() > expiresAt.getTime()) return false

  const silent = businessDaysSince(input.sentAt, now) >= FOLLOW_UP_BUSINESS_DAYS
  const expiringSoon = daysBetween(now, expiresAt) <= VALIDITY_ALERT_DAYS

  return silent || expiringSoon
}

/** Un chantier termine dont il reste quelque chose a facturer. */
export function completionIsUnbilled(
  input: { completedAt: Date; remaining: Cents },
  now: Date,
): boolean {
  if (input.remaining <= 0) return false
  return businessDaysSince(input.completedAt, now) >= UNBILLED_BUSINESS_DAYS
}

/**
 * Une attestation dont l'echeance approche — ou est passee.
 *
 * Une attestation expiree reste dans la file : c'est le moment ou elle coute le
 * plus cher, la retirer alors serait absurde.
 */
export function certificateIsExpiring(validUntil: Date, now: Date): boolean {
  return daysBetween(now, validUntil) <= RENEWAL_ALERT_DAYS
}

/**
 * L'urgence, ramenee a une seule echelle ou le plus grand est le plus presse.
 *
 * Un temps restant se lit a l'envers d'un temps ecoule : c'est ce changement de
 * signe qui permet de trier les deux sens avec la meme comparaison.
 */
function urgency(task: Task): number {
  return task.delay.sense === 'elapsed' ? task.delay.days : -task.delay.days
}

/** Par nature, puis du plus presse au moins presse. */
export function orderTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const rank = TASK_ORDER.indexOf(a.kind) - TASK_ORDER.indexOf(b.kind)
    return rank !== 0 ? rank : urgency(b) - urgency(a)
  })
}
