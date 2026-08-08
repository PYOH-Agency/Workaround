import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { insuranceCertificate } from '@/db/schema'
import { SessionError } from '@/lib/session'
import { currentStaff } from '@/lib/staff-session'
import { DateText } from '@/ui/atoms/date-text'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { AppShell } from '@/ui/shells/app-shell'

const KINDS = { decennale: 'Garantie décennale', rc_pro: 'RC professionnelle' } as const

/**
 * La file de revue interne.
 *
 * Gardee par `currentStaff` : un artisan qui atteint cette adresse obtient un
 * 404, pas une redirection. L'existence meme de l'ecran ne le regarde pas.
 */
export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ valide?: string; refus?: string }>
}) {
  try {
    await currentStaff()
  } catch (e) {
    if (e instanceof SessionError) notFound()
    throw e
  }

  const { valide, refus } = await searchParams

  const pending = await db.query.insuranceCertificate.findMany({
    where: eq(insuranceCertificate.status, 'pending'),
    with: { company: true },
    orderBy: asc(insuranceCertificate.uploadedAt),
  })

  return (
    <AppShell>
      <div className="flex flex-col gap-1">
        <Heading level={1}>Attestations à vérifier</Heading>
        <Text size="sm" tone="soft">
          La plus ancienne d’abord. Chaque validation rattache un libellé d’attestation à une
          activité du référentiel — c’est cette correspondance qui engage.
        </Text>
      </div>

      {valide && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-card border border-verified bg-verified-bg px-5 py-4 text-verified"
        >
          <Icon name="check" />
          <Text as="span">Attestation validée.</Text>
        </div>
      )}
      {refus && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-card border border-warning bg-warning-bg px-5 py-4 text-warning"
        >
          <Icon name="alert" />
          <Text as="span">Attestation refusée, le motif a été enregistré.</Text>
        </div>
      )}

      {pending.length === 0 ? (
        <Text size="sm" tone="muted">
          Rien en attente.
        </Text>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((certificate) => (
            <li key={certificate.id}>
              <Link href={`/attestations/${certificate.id}`} tone="bare">
                <Card elevation="e1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Text as="span">{certificate.company.legalName}</Text>
                    <Text size="sm" tone="muted" as="span">
                      {KINDS[certificate.kind]}
                    </Text>
                    <Text size="sm" tone="muted" as="span">
                      <span className="ml-auto">
                        déposée le <DateText value={certificate.uploadedAt} format="short" />
                      </span>
                    </Text>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
