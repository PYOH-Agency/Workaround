import { DateText } from '@/ui/atoms/date-text'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

export interface DisputeInReview {
  quoteId: string
  quoteNumber: string
  expiresAt: Date
}

/**
 * Ce qui est en cours d'instruction, annonce **au-dessus** des chiffres.
 *
 * Un taux qui baisse sans explication est exactement ce que ce jalon existe
 * pour eviter : l'artisan doit savoir que le volume affiche a cote de son taux
 * de delai est inferieur a son nombre de chantiers, et pourquoi.
 */
export function DisputeList({ disputes }: { disputes: DisputeInReview[] }) {
  if (disputes.length === 0) return null

  const plural = disputes.length > 1 ? 's' : ''

  return (
    <Card elevation="flat">
      <div className="flex flex-col gap-2" data-testid="contestations-en-cours">
        <Text size="label" tone="muted">
          {disputes.length} contestation{plural} en cours
        </Text>
        <Text size="sm" tone="soft">
          Ce{plural ? 's' : ''} chantier{plural} ne compte{plural ? 'nt' : ''} pas dans votre taux
          de délai tant que votre client n’a pas répondu.
        </Text>
        <ul className="flex flex-col gap-1">
          {disputes.map((dispute) => (
            <li key={dispute.quoteId}>
              <Text size="sm" tone="soft" as="span">
                <Link href={`/devis/${dispute.quoteId}`}>Devis {dispute.quoteNumber}</Link> —
                réponse attendue avant le <DateText value={dispute.expiresAt} format="short" />
              </Text>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
