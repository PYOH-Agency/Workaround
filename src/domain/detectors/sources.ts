import type { Anomaly } from '../anomaly'

const SILENCE_LIMIT_MS = 48 * 3_600_000

export interface SourceState {
  source: 'sirene' | 'bodacc'
  /** Date du dernier constat REUSSI, ou `null` si la source n'a jamais repondu. */
  lastCheckedAt: Date | null
  /** Depuis quand on aurait du avoir un constat. Utile quand il n'y en a aucun. */
  since?: Date
}

/**
 * Les sources devenues muettes.
 *
 * Ce detecteur ne fonctionne QUE parce que M3 a decide qu'une source
 * indisponible n'ecrit aucun constat plutot qu'un constat faux. La date du
 * dernier constat vieillit, et c'est cela qu'on lit. L'inverse — enregistrer
 * « actif » en cas de panne — aurait produit un systeme silencieux et faux.
 */
export function detectSilentSources(
  states: SourceState[],
  now: Date,
  companyCount: number,
): Anomaly[] {
  // Sans entreprise, aucun controle n'a lieu d'etre : crier a la panne au tout
  // premier lancement est le meilleur moyen de faire ignorer l'outil.
  if (companyCount === 0) return []

  return states
    .filter((s) => !s.lastCheckedAt || now.getTime() - s.lastCheckedAt.getTime() > SILENCE_LIMIT_MS)
    .map((s) => ({
      type: 'source_silent' as const,
      severity: 'blocking' as const,
      subjectId: s.source,
      since: s.lastCheckedAt ?? s.since ?? now,
      detail: s.lastCheckedAt
        ? `Aucun constat de ${s.source} depuis le ${s.lastCheckedAt.toLocaleDateString('fr-FR')} : la vérification s’est arrêtée`
        : `${s.source} n’a jamais répondu : la vérification n’a jamais tourné`,
      href: '/supervision',
      fingerprint: `${s.source}|${s.lastCheckedAt?.toISOString() ?? 'jamais'}`,
    }))
}
