import type { DirectoryResult } from '@/services/directory'
import { Badge } from '@/ui/atoms/badge'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * Les resultats.
 *
 * Chaque carte nomme **l'activite cherchee** et rappelle qu'elle est couverte :
 * c'est la seule chose que l'annuaire garantit, et la seule que personne
 * d'autre ne dit. Aucune metrique ici — elles arrivent en M5.
 */
export function ResultList({
  results,
  activityLabel,
}: {
  results: DirectoryResult[]
  activityLabel: string
}) {
  return (
    <ul className="flex flex-col gap-3">
      {results.map((result) => (
        <li key={result.companyId}>
          <Link href={`/artisan/${result.slug}`} tone="bare">
            <Card elevation="e1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Text as="span">{result.legalName}</Text>
                  <Text size="sm" tone="muted" as="span">
                    {result.cityLabel} · {result.postalCode}
                  </Text>
                </div>
                <Badge tone="verified" icon={<Icon name="check" size="sm" />}>
                  {activityLabel}
                </Badge>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
