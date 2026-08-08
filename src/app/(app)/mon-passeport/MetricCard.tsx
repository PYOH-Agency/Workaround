import type { Rate } from '@/domain/passport-metrics'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * Une metrique.
 *
 * Le composant recoit l'objet `Rate` **entier**, jamais deux proprietes
 * separees : c'est ce qui rend impossible d'afficher un taux sans le volume sur
 * lequel il porte. Le seuil empeche d'afficher un chiffre non significatif ; le
 * volume empeche de lire un chiffre significatif comme s'il etait exhaustif.
 */
export function MetricCard({
  label,
  rate,
  definition,
  testId,
}: {
  label: string
  rate: Rate
  definition: string
  testId: string
}) {
  const plural = rate.volume > 1 ? 's' : ''

  return (
    <Card elevation="e1">
      <div className="flex flex-col gap-1" data-testid={testId}>
        <Text size="label" tone="muted">
          {label}
        </Text>

        {rate.value === null ? (
          <Text tone="muted">Pas encore assez de données</Text>
        ) : (
          <Heading level={2}>{rate.value} %</Heading>
        )}

        {/* Toujours rendu, y compris sous le seuil. */}
        <Text size="sm" tone="soft">
          sur {rate.volume} chantier{plural} passé{plural} par l’outil
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
