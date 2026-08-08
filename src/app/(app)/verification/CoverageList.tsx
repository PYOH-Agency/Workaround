import type { CoveredActivity } from '@/services/visibility'
import type { CoverageReason } from '@/domain/coverage'

/**
 * Chaque motif est enonce en clair. L'article 22.3 interdit la suspension
 * muette : l'artisan doit savoir QUELLE activite est retiree et POURQUOI.
 */
const REASONS: Record<CoverageReason, string> = {
  covered: 'Couverte',
  no_certificate: 'Attestation manquante',
  wrong_insurance: 'Assurance inadaptée',
  expired: 'Attestation expirée',
  legal_block: 'Entreprise bloquée',
}

const EXPLANATIONS: Record<CoverageReason, string> = {
  covered: 'Visible sur votre page publique.',
  no_certificate: 'Déposez une attestation couvrant cette activité.',
  wrong_insurance:
    'Cette activité engage la garantie décennale ; votre attestation ne couvre que la RC professionnelle.',
  expired: 'La période de validité de votre attestation ne couvre pas la date du jour.',
  legal_block: 'Une procédure collective ou une radiation suspend toutes vos activités.',
}

export function CoverageList({ activities }: { activities: CoveredActivity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm opacity-70">Aucune activité déclarée pour l’instant.</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
      {activities.map((item) => (
        <li key={item.code} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 text-sm">
          <span className="font-mono opacity-60">{item.code}</span>
          <span className="flex-1">{item.label}</span>
          <span
            data-testid={`statut-${item.code}`}
            className={item.visible ? 'text-emerald-600' : 'text-amber-600'}
          >
            {REASONS[item.reason]}
          </span>
          <span className="w-full text-xs opacity-60">{EXPLANATIONS[item.reason]}</span>
        </li>
      ))}
    </ul>
  )
}
