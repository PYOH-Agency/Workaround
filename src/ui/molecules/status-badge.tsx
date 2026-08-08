import type { PaymentStatus } from '@/domain/payment-status'
import { Badge } from '@/ui/atoms/badge'
import { Icon } from '@/ui/atoms/icon'

/**
 * Le seul endroit du produit qui sait quelle couleur porte quel statut.
 *
 * Disperser cette correspondance dans les ecrans garantit qu'un jour « refuse »
 * sera vert quelque part. Un test verifie que tous les statuts du schema et du
 * domaine sont couverts.
 */

type Entry = {
  tone: 'neutral' | 'verified' | 'warning' | 'danger'
  label: string
  icon: React.ReactNode
}

/** Valeurs de `src/db/schema/quote.ts`. */
export type QuoteStatus = 'draft' | 'sent' | 'signed' | 'refused' | 'expired'

export const quoteStatus: Record<QuoteStatus, Entry> = {
  draft: { tone: 'neutral', label: 'Brouillon', icon: <Icon name="document" size="sm" /> },
  sent: { tone: 'warning', label: 'Envoyé', icon: <Icon name="clock" size="sm" /> },
  signed: { tone: 'verified', label: 'Signé', icon: <Icon name="check" size="sm" /> },
  refused: { tone: 'danger', label: 'Refusé', icon: <Icon name="close" size="sm" /> },
  expired: { tone: 'danger', label: 'Expiré', icon: <Icon name="alert" size="sm" /> },
}

/**
 * Le type vient du domaine, il n'est pas recopie : ajouter un statut a
 * `PaymentStatus` casse la compilation ici plutot que de passer inapercu.
 */
export const paymentStatus: Record<PaymentStatus, Entry> = {
  unpaid: { tone: 'warning', label: 'À encaisser', icon: <Icon name="clock" size="sm" /> },
  partially_paid: {
    tone: 'warning',
    label: 'Partiellement payée',
    icon: <Icon name="clock" size="sm" />,
  },
  paid: { tone: 'verified', label: 'Payée', icon: <Icon name="check" size="sm" /> },
  overdue: { tone: 'danger', label: 'En retard', icon: <Icon name="alert" size="sm" /> },
}

export function StatusBadge({
  kind,
  status,
  testId,
}: {
  kind: 'quote' | 'payment'
  status: string
  testId?: string
}) {
  const table: Record<string, Entry> = kind === 'quote' ? quoteStatus : paymentStatus
  const entry = table[status]

  // Un statut inconnu n'affiche rien plutot qu'une pastille muette : c'est le
  // test de couverture qui doit le detecter, pas l'utilisateur.
  if (!entry) return null

  return (
    <Badge tone={entry.tone} icon={entry.icon} testId={testId}>
      {entry.label}
    </Badge>
  )
}
