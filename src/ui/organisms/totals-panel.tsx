import { format, type Cents } from '@/domain/money'
import { SummaryLine } from '@/ui/molecules/summary-line'

/** Le taux est en centiemes de pourcent : 2000 => « 20,0 % ». */
function formatRate(rate: number): string {
  return `${(rate / 100).toFixed(1).replace('.', ',')} %`
}

export type Totals = {
  totalExclTax: Cents
  totalInclTax: Cents
  byRate: Array<{ rate: number; baseExclTax: Cents; taxAmount: Cents }>
}

/**
 * Totaux et ventilation de TVA.
 *
 * Un seul composant pour l'ecran de redaction, la fiche de devis et la page
 * publique : c'est la meme information, et la voir differemment d'un ecran a
 * l'autre est precisement ce qui fait douter un client.
 */
export function TotalsPanel({ totals }: { totals: Totals }) {
  return (
    <div className="ml-auto w-full max-w-xs">
      <SummaryLine label="Total HT" cents={totals.totalExclTax} testId="total-ht" />
      {totals.byRate.map((b) => (
        <SummaryLine
          key={b.rate}
          label={`TVA ${formatRate(b.rate)} sur ${format(b.baseExclTax)} €`}
          cents={b.taxAmount}
          emphasis="muted"
        />
      ))}
      <SummaryLine
        label="Total TTC"
        cents={totals.totalInclTax}
        emphasis="total"
        testId="total-ttc"
      />
    </div>
  )
}
