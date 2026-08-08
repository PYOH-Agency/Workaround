import type { Cents } from '@/domain/money'
import { Money } from '@/ui/atoms/money'

/** Le taux est en centiemes de pourcent : 2000 => « 20,0 % ». */
function formatRate(rate: number): string {
  return `${(rate / 100).toFixed(1).replace('.', ',')} %`
}

export type QuoteLine = {
  label: string
  quantity: string
  unit: string
  unitPriceExclTax: Cents
  taxRate: number
}

/**
 * Les lignes d'un devis en lecture.
 *
 * Ici le `<table>` est le bon choix, contrairement a la liste des devis : c'est
 * de la donnee tabulaire, avec des colonnes de montants qui doivent s'aligner.
 * Sur petit ecran c'est le conteneur qui defile, jamais la page.
 */
export function QuoteLinesTable({ lines }: { lines: QuoteLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-md text-sm">
        <thead>
          <tr className="border-b border-field text-left">
            <th className="py-2 font-semibold text-ink">Désignation</th>
            <th className="py-2 text-right font-semibold text-ink">Qté</th>
            <th className="py-2 text-right font-semibold text-ink">P.U. HT</th>
            <th className="py-2 text-right font-semibold text-ink">TVA</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="border-b border-rule">
              <td className="py-2 text-ink">{line.label}</td>
              <td className="py-2 text-right tabular-nums text-ink-soft">
                {line.quantity} {line.unit}
              </td>
              <td className="py-2 text-right">
                <Money cents={line.unitPriceExclTax} currency={false} />
              </td>
              <td className="py-2 text-right tabular-nums text-ink-soft">
                {formatRate(line.taxRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
