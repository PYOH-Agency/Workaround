import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity, insuranceCertificate } from '@/db/schema'
import { SessionError } from '@/lib/session'
import { currentStaff } from '@/lib/staff-session'
import { createServiceSupabase } from '@/lib/supabase-server'
import { CERTIFICATE_BUCKET } from '@/services/certificates'
import { DateText } from '@/ui/atoms/date-text'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { AppShell } from '@/ui/shells/app-shell'
import { ReviewForm } from './ReviewForm'

const KINDS = { decennale: 'Garantie décennale', rc_pro: 'RC professionnelle' } as const

/** Cinq minutes : le temps d'une revue, pas davantage. Le compartiment est privé. */
const SIGNED_URL_SECONDS = 300

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await currentStaff()
  } catch (e) {
    if (e instanceof SessionError) notFound()
    throw e
  }

  const { id } = await params

  const certificate = await db.query.insuranceCertificate.findFirst({
    where: eq(insuranceCertificate.id, id),
    with: { company: true },
  })

  if (!certificate) notFound()

  const [referential, signed] = await Promise.all([
    db.select({ code: activity.code, label: activity.label }).from(activity).orderBy(activity.code),
    createServiceSupabase()
      .storage.from(CERTIFICATE_BUCKET)
      .createSignedUrl(certificate.storagePath, SIGNED_URL_SECONDS),
  ])

  return (
    <AppShell>
      <div className="flex flex-col gap-1">
        <Heading level={1}>{certificate.company.legalName}</Heading>
        <Text size="sm" tone="soft">
          {KINDS[certificate.kind]} · SIRET {certificate.company.siret} · déposée le{' '}
          <DateText value={certificate.uploadedAt} format="short" />
        </Text>
      </div>

      {signed.data?.signedUrl && (
        <object
          data={signed.data.signedUrl}
          type="application/pdf"
          className="h-[560px] w-full rounded-card border border-rule"
        >
          {/* Repli si le navigateur n'affiche pas le PDF en ligne. */}
          <Link href={signed.data.signedUrl}>Ouvrir l’attestation</Link>
        </object>
      )}

      {certificate.status === 'pending' ? (
        <ReviewForm certificateId={certificate.id} options={referential} />
      ) : (
        <div role="status" className="rounded-card border border-rule bg-card px-5 py-4">
          <Text size="sm" tone="soft">
            Cette attestation a déjà été traitée : {certificate.status}.
          </Text>
        </div>
      )}

      <div className="mt-2">
        <Link href="/attestations" tone="bare">
          <span className="text-sm">Retour à la file</span>
        </Link>
      </div>
    </AppShell>
  )
}
