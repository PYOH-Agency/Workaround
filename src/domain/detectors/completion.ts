import type { Anomaly } from '../anomaly'

/**
 * En deca, l'ecart s'explique par le delai normal entre la fin des travaux et
 * l'emission du solde. Au-dela, il demande un regard.
 */
const DRIFT_LIMIT_DAYS = 7

export interface CompletionRecord {
  quoteId: string
  companyName: string
  /** `null` quand aucune declaration n'a precede le solde. */
  declaredAt: Date | null
  invoicedAt: Date
}

/**
 * L'ecart entre une fin declaree et la facture de solde qui l'a auditee.
 *
 * Classe `signal` : un ecart de dates n'accuse personne, il designe un dossier
 * a regarder. C'est le meme classement que `shared_signer`, et pour la meme
 * raison — un detecteur qui crie fort sur des cas explicables finit ignore.
 */
export function detectCompletionDrift(records: CompletionRecord[]): Anomaly[] {
  return records
    .filter((r) => r.declaredAt !== null)
    .map((r) => ({
      ...r,
      drift: Math.round((r.invoicedAt.getTime() - r.declaredAt!.getTime()) / 86_400_000),
    }))
    .filter((r) => Math.abs(r.drift) > DRIFT_LIMIT_DAYS)
    .map((r) => ({
      type: 'completion_drift' as const,
      severity: 'signal' as const,
      subjectId: r.quoteId,
      since: r.declaredAt!,
      detail:
        r.drift > 0
          ? `${r.companyName} a déclaré un chantier terminé ${r.drift} jours avant d’en émettre le solde`
          : `${r.companyName} a déclaré un chantier terminé ${-r.drift} jours après en avoir émis le solde`,
      href: '/supervision',
      fingerprint: `${r.quoteId}|${r.declaredAt!.toISOString()}|${r.invoicedAt.toISOString()}`,
    }))
}
