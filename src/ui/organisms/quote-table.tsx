import Link from 'next/link'
import type { Cents } from '@/domain/money'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { StatusBadge } from '@/ui/molecules/status-badge'

export type QuoteRow = {
  id: string
  number: string | null
  label: string
  totalInclTax: Cents
  status: string
}

/**
 * La liste des devis.
 *
 * Une liste de cartes cliquables plutot qu'un `<table>` : sur mobile, un tableau
 * a cinq colonnes force le defilement horizontal, et l'artisan consulte ses
 * devis depuis un chantier, pas depuis un bureau.
 */
export function QuoteTable({ quotes }: { quotes: QuoteRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {quotes.map((q) => (
        <li key={q.id}>
          <Link href={`/devis/${q.id}`} className="block rounded-card">
            <Card elevation="e1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Text size="sm" tone="muted" as="span">
                    {q.number ?? 'Brouillon'}
                  </Text>
                  <Text as="span">{q.label}</Text>
                </div>
                <StatusBadge kind="quote" status={q.status} />
                <Money cents={q.totalInclTax} emphasis="strong" />
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
