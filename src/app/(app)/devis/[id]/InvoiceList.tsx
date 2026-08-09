import { TYPE_LABELS } from '@/pdf/invoice-pdf'
import { Link } from '@/ui/atoms/link'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

export interface IssuedInvoice {
  id: string
  number: string
  type: keyof typeof TYPE_LABELS
  totalInclTax: number
}

/** Les factures deja emises contre ce devis, dans l'ordre de leur numero. */
export function InvoiceList({ invoices }: { invoices: IssuedInvoice[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {invoices.map((row) => (
        <li key={row.id}>
          <Link href={`/factures/${row.id}`} tone="bare">
            <Card elevation="e1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Text size="sm" tone="muted" as="span">
                  {row.number}
                </Text>
                <Text as="span">{TYPE_LABELS[row.type]}</Text>
                <span className="ml-auto">
                  <Money cents={row.totalInclTax} emphasis="strong" />
                </span>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
