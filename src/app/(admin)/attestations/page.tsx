import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { insuranceCertificate } from '@/db/schema'
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'

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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Attestations à vérifier</h1>
        <p className="mt-1 text-sm opacity-70">
          La plus ancienne d’abord. Chaque validation rattache un libellé d’attestation à une
          activité du référentiel — c’est cette correspondance qui engage.
        </p>
      </div>

      {valide && (
        <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
          Attestation validée.
        </p>
      )}
      {refus && (
        <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          Attestation refusée, le motif a été enregistré.
        </p>
      )}

      {pending.length === 0 ? (
        <p className="text-sm opacity-70">Rien en attente.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {pending.map((certificate) => (
            <li key={certificate.id}>
              <Link
                href={`/attestations/${certificate.id}`}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 text-sm"
              >
                <span className="flex-1">{certificate.company.legalName}</span>
                <span className="opacity-70">{KINDS[certificate.kind]}</span>
                <span className="opacity-60">
                  déposée le {certificate.uploadedAt.toLocaleDateString('fr-FR')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
