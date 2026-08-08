import Link from 'next/link'
import { notFound } from 'next/navigation'
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'
import { currentAnomalies } from '@/services/anomalies'
import { AnomalyList } from './AnomalyList'

/**
 * La file d'anomalies.
 *
 * Un seul ecran, une seule habitude. La question a laquelle il repond est
 * binaire : quelque chose demande-t-il un humain ? Une liste vide est la bonne
 * reponse la plupart des jours — et c'est pour cela qu'il n'y a ni courbe ni
 * compteur decoratif.
 */
export default async function SupervisionPage() {
  try {
    await currentStaff()
  } catch (e) {
    if (e instanceof SessionError) notFound()
    throw e
  }

  const now = new Date()
  const anomalies = await currentAnomalies(now)
  const blocking = anomalies.filter((a) => a.severity === 'blocking').length

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Supervision</h1>
          <p className="mt-1 text-sm opacity-70">
            {blocking > 0
              ? `${blocking} anomalie${blocking > 1 ? 's' : ''} bloquante${blocking > 1 ? 's' : ''}.`
              : 'Rien ne bloque.'}
          </p>
        </div>
        <Link href="/attestations" className="text-sm underline opacity-70">
          File des attestations
        </Link>
      </div>

      {anomalies.length === 0 ? (
        <p className="text-sm opacity-70">Rien ne demande votre attention.</p>
      ) : (
        <AnomalyList anomalies={anomalies} now={now} />
      )}
    </main>
  )
}
