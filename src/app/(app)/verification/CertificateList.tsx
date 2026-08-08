import { Badge } from '@/ui/atoms/badge'
import { DateText } from '@/ui/atoms/date-text'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { TYPE_LABELS } from './labels'

export interface CertificateRow {
  id: string
  kind: 'decennale' | 'rc_pro'
  status: 'pending' | 'validated' | 'rejected'
  rejectionReason: string | null
  validUntil: Date | null
  uploadedAt: Date
  activities: { activity: { code: string; label: string } }[]
}

const STATUS = {
  pending: { label: 'En cours de vérification', tone: 'warning', icon: 'clock' },
  validated: { label: 'Validée', tone: 'verified', icon: 'check' },
  rejected: { label: 'Refusée', tone: 'danger', icon: 'close' },
} as const

export function CertificateList({ certificates }: { certificates: CertificateRow[] }) {
  if (certificates.length === 0) {
    return (
      <Text size="sm" tone="muted">
        Aucune attestation déposée.
      </Text>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {certificates.map((certificate) => {
        const status = STATUS[certificate.status]

        return (
          <li key={certificate.id}>
            <Card elevation="flat">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Text as="span">{TYPE_LABELS[certificate.kind]}</Text>
                  <span className="ml-auto">
                    <Badge
                      tone={status.tone}
                      icon={<Icon name={status.icon} size="sm" />}
                      testId="statut-attestation"
                    >
                      {status.label}
                    </Badge>
                  </span>
                </div>

                {certificate.validUntil && (
                  <Text size="sm" tone="muted">
                    Valide jusqu’au <DateText value={certificate.validUntil} format="short" />
                  </Text>
                )}

                {/* Jamais de refus muet : le motif est communique a l'artisan. */}
                {certificate.rejectionReason && (
                  <Text size="sm" tone="muted">
                    <span className="text-danger">{certificate.rejectionReason}</span>
                  </Text>
                )}

                {certificate.activities.length > 0 && (
                  <Text size="sm" tone="muted">
                    Couvre : {certificate.activities.map((a) => a.activity.label).join(', ')}
                  </Text>
                )}
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
