import type { CoverageReason } from '@/domain/coverage'
import type { CoveredActivity } from '@/services/visibility'
import { Badge } from '@/ui/atoms/badge'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

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

/**
 * Le ton de la pastille suit la gravite du motif, et pas seulement le fait
 * d'etre visible ou non : une attestation manquante se corrige en la deposant,
 * une assurance inadaptee demande de changer de contrat.
 */
const TONES: Record<CoverageReason, 'verified' | 'warning' | 'danger'> = {
  covered: 'verified',
  no_certificate: 'warning',
  wrong_insurance: 'danger',
  expired: 'danger',
  legal_block: 'danger',
}

const ICONS = {
  verified: <Icon name="check" size="sm" />,
  warning: <Icon name="clock" size="sm" />,
  danger: <Icon name="alert" size="sm" />,
} as const

export function CoverageList({ activities }: { activities: CoveredActivity[] }) {
  if (activities.length === 0) {
    return (
      <Text size="sm" tone="muted">
        Aucune activité déclarée pour l’instant.
      </Text>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {activities.map((item) => {
        const tone = TONES[item.reason]

        return (
          <li key={item.code}>
            <Card elevation="flat">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Text size="sm" tone="muted" as="span">
                    {item.code}
                  </Text>
                  <Text as="span">{item.label}</Text>
                  <span className="ml-auto">
                    <Badge tone={tone} icon={ICONS[tone]} testId={`statut-${item.code}`}>
                      {REASONS[item.reason]}
                    </Badge>
                  </span>
                </div>
                <Text size="sm" tone="muted">
                  {EXPLANATIONS[item.reason]}
                </Text>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
