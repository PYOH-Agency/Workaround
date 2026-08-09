import type { MedianDays } from '@/domain/quote-lead-time'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * Une mesure exprimee en jours.
 *
 * Meme discipline que `MetricCard` : le composant recoit l'objet `MedianDays`
 * **entier**, jamais deux proprietes separees. Le seuil empeche d'afficher un
 * chiffre non significatif ; le volume empeche de lire un chiffre significatif
 * comme s'il etait exhaustif.
 */
export function MedianCard({
  label,
  median,
  definition,
  testId,
}: {
  label: string
  median: MedianDays
  definition: string
  testId: string
}) {
  return (
    <Card elevation="e1">
      <div className="flex flex-col gap-1" data-testid={testId}>
        <Text size="label" tone="muted" as="h2">
          {label}
        </Text>

        {median.value === null ? (
          <Text tone="muted">Pas encore assez de données</Text>
        ) : (
          <Heading level={2} as="p">
            {median.value.toLocaleString('fr-FR')} jour{median.value > 1 ? 's' : ''}
          </Heading>
        )}

        {/* Toujours rendu, y compris sous le seuil. */}
        <Text size="sm" tone="soft">
          sur {median.volume} devis remis après une visite
        </Text>

        <Text size="sm" tone="muted">
          {definition}{' '}
          <Link href="/passeport/definitions" newTab>
            Comment c’est calculé
          </Link>
        </Text>
      </div>
    </Card>
  )
}
