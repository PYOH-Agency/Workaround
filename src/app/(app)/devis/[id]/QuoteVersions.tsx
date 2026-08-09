import type { QuoteVersion } from '@/domain/quote-versions'
import { Link } from '@/ui/atoms/link'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { StatusBadge } from '@/ui/molecules/status-badge'

/**
 * L'historique des versions.
 *
 * Le devis d'origine reste consultable pour toujours : c'est lui que la
 * metrique « ecart devis vers facture » comparera au total facture.
 */
export function QuoteVersions({ versions, currentId }: { versions: QuoteVersion[]; currentId: string }) {
  return (
    <ul className="flex flex-col gap-3">
      {versions.map((version) => (
        <li key={version.id}>
          <Link href={`/devis/${version.id}`} tone="bare">
            <Card elevation={version.id === currentId ? 'e2' : 'flat'}>
              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-2"
                data-testid={`version-${version.version}`}
              >
                <Text as="span" size="sm" tone="muted">
                  {version.version === 1 ? 'Devis initial' : `Avenant n° ${version.version - 1}`}
                </Text>
                <StatusBadge kind="quote" status={version.status} />
                <span className="ml-auto">
                  <Money cents={version.totalInclTax} emphasis="strong" />
                </span>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
