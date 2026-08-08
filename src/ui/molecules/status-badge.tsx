import type { PaymentStatus } from '@/domain/payment-status'
import { Badge } from '@/ui/atoms/badge'
import { IconAlert, IconCheck, IconClock, IconClose, IconDocument } from '@/ui/atoms/icon'

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

export const QUOTE_STATUS: Record<QuoteStatus, Entry> = {
  draft: { tone: 'neutral', label: 'Brouillon', icon: <IconDocument size="sm" /> },
  sent: { tone: 'warning', label: 'Envoyé', icon: <IconClock size="sm" /> },
  signed: { tone: 'verified', label: 'Signé', icon: <IconCheck size="sm" /> },
  refused: { tone: 'danger', label: 'Refusé', icon: <IconClose size="sm" /> },
  expired: { tone: 'danger', label: 'Expiré', icon: <IconAlert size="sm" /> },
}

/**
 * Le type vient du domaine, il n'est pas recopie : ajouter un statut a
 * `PaymentStatus` casse la compilation ici plutot que de passer inapercu.
 */
export const PAYMENT_STATUS: Record<PaymentStatus, Entry> = {
  unpaid: { tone: 'warning', label: 'À encaisser', icon: <IconClock size="sm" /> },
  partially_paid: {
    tone: 'warning',
    label: 'Partiellement payée',
    icon: <IconClock size="sm" />,
  },
  paid: { tone: 'verified', label: 'Payée', icon: <IconCheck size="sm" /> },
  overdue: { tone: 'danger', label: 'En retard', icon: <IconAlert size="sm" /> },
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
  const table: Record<string, Entry> = kind === 'quote' ? QUOTE_STATUS : PAYMENT_STATUS
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
