import { notFound } from 'next/navigation'
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'
import { currentAnomalies } from '@/services/anomalies'
import { Link } from '@/ui/atoms/link'
import { EmptyState } from '@/ui/molecules/empty-state'
import { PageHeader } from '@/ui/molecules/page-header'
import { AppShell } from '@/ui/shells/app-shell'
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
    <AppShell>
      {/*
        Les deux liens vers la file et les entreprises vivaient ici, poses a la
        main : ils sont desormais dans la navigation, qui les marque en plus
        quand on y est. Les garder les aurait fait apparaitre deux fois sur le
        meme ecran.
      */}
      <PageHeader
        title="Supervision"
        subtitle={
          blocking > 0
            ? `${blocking} anomalie${blocking > 1 ? 's' : ''} bloquante${blocking > 1 ? 's' : ''}.`
            : 'Rien ne bloque.'
        }
      />

      {anomalies.length === 0 ? (
        <EmptyState
          title="Rien ne demande votre attention"
          description="Les attestations sont à jour, les sources répondent, et aucun signal n’est en attente d’examen."
          action={
            <Link href="/attestations" tone="bare">
              <span className="text-sm">Voir la file des attestations</span>
            </Link>
          }
        />
      ) : (
        <AnomalyList anomalies={anomalies} now={now} />
      )}
    </AppShell>
  )
}
