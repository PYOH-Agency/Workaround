import { notFound } from 'next/navigation'
import { currentStaff } from '@/lib/staff-session'
import { SessionError } from '@/lib/session'
import { currentAnomalies } from '@/services/anomalies'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { EmptyState } from '@/ui/molecules/empty-state'
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
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={1}>Supervision</Heading>
          <Text size="sm" tone="soft">
            {blocking > 0
              ? `${blocking} anomalie${blocking > 1 ? 's' : ''} bloquante${blocking > 1 ? 's' : ''}.`
              : 'Rien ne bloque.'}
          </Text>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/attestations" tone="bare">
            <span className="text-sm">File des attestations</span>
          </Link>
          <Link href="/entreprises" tone="bare">
            <span className="text-sm">Entreprises</span>
          </Link>
        </div>
      </div>

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
