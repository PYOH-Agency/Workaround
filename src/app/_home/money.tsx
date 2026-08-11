import { MoneyFlow } from '@/ui/organisms/money-flow'
import type { MoneyInFlight } from '@/services/home'

/** `MoneyBand` et non `Money` : l'atome du design system porte déjà ce nom. */
export function MoneyBand({ money, signedCount }: { money: MoneyInFlight; signedCount: number }) {
  const total = money.signedNotInvoiced + money.invoicedOnTime + money.overdue

  return (
    <MoneyFlow
      totalInclTax={total}
      caption={`signés et pas encore encaissés, sur ${signedCount} chantiers`}
      context={{ amountInclTax: money.cashedLast12Months, caption: 'encaissés sur 12 mois' }}
      segments={[
        {
          label: 'Signé, pas encore facturé',
          amountInclTax: money.signedNotInvoiced,
          note: 'votre carnet de commandes',
          href: '/devis',
          fill: 'brand',
        },
        {
          label: 'Facturé, dans les délais',
          amountInclTax: money.invoicedOnTime,
          note: 'échéances à venir',
          href: '/factures',
          fill: 'muted',
        },
        {
          label: 'En retard de paiement',
          amountInclTax: money.overdue,
          note: 'retenue de garantie exclue',
          href: '/factures',
          fill: 'late',
        },
      ]}
    />
  )
}
