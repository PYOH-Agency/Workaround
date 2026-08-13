/**
 * Les garanties legales de la construction, comptees depuis la RECEPTION.
 *
 * La reception est un acte juridique, et `completed_at` n'en est pas un : il
 * vaut soit declaration de l'artisan, soit emission du solde. La reception
 * tacite, elle, exige **deux criteres cumulatifs** — prise de possession sans
 * reserve et paiement integral — et des reserves exprimees, meme verbalement,
 * suffisent a l'ecarter.
 *
 * Nous connaissons le paiement. Nous ignorons la prise de possession et les
 * reserves. **Nous n'affirmons donc jamais une date que nous n'avons pas
 * constatee** : c'est le maitre d'ouvrage qui declare. Imprimer une date fausse
 * sur l'ecran d'un particulier lui ferait manquer un delai de forclusion.
 */
export const GUARANTEES = [
  { key: 'perfect_completion', years: 1, article: 'article 1792-6' },
  { key: 'proper_function', years: 2, article: 'article 1792-3' },
  { key: 'decennial', years: 10, article: 'article 1792' },
] as const

export type GuaranteeKey = (typeof GUARANTEES)[number]['key']

export interface Deadline {
  key: GuaranteeKey
  years: number
  article: string
  endsAt: Date
}

/** Meme jour, N annees plus tard — sans deborder sur le mois suivant. */
function plusYears(from: Date, years: number): Date {
  const target = new Date(from)
  const day = target.getUTCDate()
  target.setUTCFullYear(target.getUTCFullYear() + years)
  // Un 29 fevrier reporte sur une annee non bissextile deviendrait le 1er mars.
  if (target.getUTCDate() !== day) target.setUTCDate(0)
  return target
}

/** `null` sans reception : aucune date, seulement la regle et ses conditions. */
export function guaranteeDeadlines(receivedAt: Date | null): Deadline[] | null {
  if (!receivedAt) return null

  return GUARANTEES.map((guarantee) => ({
    ...guarantee,
    endsAt: plusYears(receivedAt, guarantee.years),
  }))
}

/**
 * Minuit UTC du jour d'une date.
 *
 * Une reception est un JOUR, pas un instant : le client saisit une date, qui
 * vaut minuit. Comparee telle quelle a l'horodatage d'une signature de
 * l'apres-midi, une reception le jour meme serait refusee — alors que signer le
 * matin et recevoir le soir est un cas parfaitement ordinaire sur un petit
 * chantier.
 */
function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export interface ReceivableInput {
  signedAt: Date
  completedAt: Date | null
  declaredAt: Date
  now: Date
}

export function assertReceivable(input: ReceivableInput): void {
  if (input.completedAt === null) {
    throw new Error('Ce chantier n’est pas encore terminé')
  }
  if (startOfDay(input.declaredAt) < startOfDay(input.signedAt)) {
    throw new Error('Une réception ne peut pas être antérieure à la signature du devis')
  }
  if (startOfDay(input.declaredAt) > startOfDay(input.now)) {
    // Une reception a venir ouvrirait des garanties qui n'ont pas commence.
    throw new Error('Une réception à venir ne peut pas être déclarée')
  }
}

export interface LiftInput {
  receivedAt: Date
  liftedAt: Date
  now: Date
}

/**
 * La levee des reserves, declaree par le maitre d'ouvrage.
 *
 * Elle ne peut ni preceder la reception — on ne leve pas des reserves avant de
 * les avoir emises — ni etre datee dans le futur, ce qui debloquerait la
 * retenue de l'artisan par anticipation.
 */
export function assertReservesLiftable(input: LiftInput): void {
  if (startOfDay(input.liftedAt) < startOfDay(input.receivedAt)) {
    throw new Error('La levée des réserves ne peut pas être antérieure à la réception')
  }
  if (startOfDay(input.liftedAt) > startOfDay(input.now)) {
    throw new Error('Une levée des réserves à venir ne peut pas être déclarée')
  }
}
