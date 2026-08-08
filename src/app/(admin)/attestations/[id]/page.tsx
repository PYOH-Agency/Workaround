import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity, insuranceCertificate } from '@/db/schema'
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'
import { createServiceSupabase } from '@/lib/supabase-server'
import { CERTIFICATE_BUCKET } from '@/services/certificates'
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
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">{certificate.company.legalName}</h1>
        <p className="mt-1 text-sm opacity-70">
          {KINDS[certificate.kind]} · SIRET {certificate.company.siret} · déposée le{' '}
          {certificate.uploadedAt.toLocaleDateString('fr-FR')}
        </p>
      </div>

      {signed.data?.signedUrl && (
        <object
          data={signed.data.signedUrl}
          type="application/pdf"
          className="h-[560px] w-full rounded-xl border border-black/10 dark:border-white/15"
        >
          <a href={signed.data.signedUrl} className="underline">
            Ouvrir l’attestation
          </a>
        </object>
      )}

      {certificate.status === 'pending' ? (
        <ReviewForm certificateId={certificate.id} options={referential} />
      ) : (
        <p role="status" className="rounded-lg border border-black/15 p-4 text-sm dark:border-white/20">
          Cette attestation a déjà été traitée : {certificate.status}.
        </p>
      )}

      <Link href="/attestations" className="text-sm underline opacity-70">
        Retour à la file
      </Link>
    </main>
  )
}
