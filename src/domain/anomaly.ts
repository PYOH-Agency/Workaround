/**
 * Le vocabulaire de la file d'anomalies.
 *
 * Une anomalie se calcule a chaque lecture, jamais ne se stocke : une liste
 * stockee survivrait a sa cause. C'est la meme regle que la visibilite de M3 et
 * le reste a facturer de M2.
 */
export type Severity = 'blocking' | 'attention' | 'signal'

export type AnomalyType =
  | 'certificate_waiting'
  | 'unreachable_company'
  | 'source_silent'
  | 'shared_signer'
  | 'completion_drift'

export interface Anomaly {
  type: AnomalyType
  severity: Severity
  /** Ce sur quoi elle porte : une attestation, une entreprise, une source. */
  subjectId: string
  since: Date
  /** Ce qui ne va pas, en clair. Destine a etre lu, pas decode. */
  detail: string
  /** Ou aller pour la traiter. */
  href: string
  /**
   * Les faits observes, sous forme stable et comparable. N'a d'usage que pour
   * les anomalies examinables — les autres se resolvent en etant traitees.
   */
  fingerprint: string
}

export interface AnomalyReview {
  type: AnomalyType
  subjectId: string
  factsFingerprint: string
}

const ORDER: Record<Severity, number> = { blocking: 0, attention: 1, signal: 2 }

/** Le plus grave d'abord ; a gravite egale, le plus ancien. */
export function sortAnomalies(anomalies: Anomaly[]): Anomaly[] {
  return [...anomalies].sort(
    (a, b) => ORDER[a.severity] - ORDER[b.severity] || a.since.getTime() - b.since.getTime(),
  )
}

const key = (a: { type: AnomalyType; subjectId: string }) => `${a.type} ${a.subjectId}`

/**
 * Retire les anomalies deja examinees — a empreinte de faits identique.
 *
 * L'empreinte est ce qui empeche l'aveuglement : trois clients partageant un
 * telephone, juges benins, ne doivent pas rendre le quatrieme invisible. Un
 * fait nouveau change l'empreinte, et l'anomalie resurgit.
 */
export function suppressReviewed(anomalies: Anomaly[], reviews: AnomalyReview[]): Anomaly[] {
  const seen = new Map<string, Set<string>>()
  for (const review of reviews) {
    const bucket = seen.get(key(review)) ?? new Set<string>()
    bucket.add(review.factsFingerprint)
    seen.set(key(review), bucket)
  }

  return anomalies.filter((a) => !seen.get(key(a))?.has(a.fingerprint))
}
