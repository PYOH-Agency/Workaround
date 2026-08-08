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
  pending: 'En cours de vérification',
  validated: 'Validée',
  rejected: 'Refusée',
} as const

export function CertificateList({ certificates }: { certificates: CertificateRow[] }) {
  if (certificates.length === 0) {
    return <p className="text-sm opacity-70">Aucune attestation déposée.</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
      {certificates.map((certificate) => (
        <li key={certificate.id} className="flex flex-col gap-1 py-3 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-4">
            <span className="flex-1">{TYPE_LABELS[certificate.kind]}</span>
            <span
              data-testid="statut-attestation"
              className={certificate.status === 'validated' ? 'text-emerald-600' : 'opacity-70'}
            >
              {STATUS[certificate.status]}
            </span>
          </div>

          {certificate.validUntil && (
            <span className="text-xs opacity-60">
              Valide jusqu’au {certificate.validUntil.toLocaleDateString('fr-FR')}
            </span>
          )}

          {/* Jamais de refus muet : le motif est communique a l'artisan. */}
          {certificate.rejectionReason && (
            <span className="text-xs text-red-600">{certificate.rejectionReason}</span>
          )}

          {certificate.activities.length > 0 && (
            <span className="text-xs opacity-60">
              Couvre : {certificate.activities.map((a) => a.activity.label).join(', ')}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
