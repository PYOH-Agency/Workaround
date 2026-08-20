import { notFound } from 'next/navigation'
import { SessionError } from '@/lib/session'
import { currentStaff } from '@/lib/staff-session'
import { leadFunnel, openRequests } from '@/services/lead-metrics'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { EmptyState } from '@/ui/molecules/empty-state'
import { PageHeader } from '@/ui/molecules/page-header'
import { AdminShell } from '@/ui/shells/admin-shell'
import { Funnel } from './Funnel'
import { RequestList } from './RequestList'

const PERIODS = [7, 30, 90] as const
const DEFAULT_PERIOD = 30

/**
 * La periode demandee, ou trente jours.
 *
 * Une valeur hors table retombe sur le defaut plutot que de rendre un 404 : le
 * parametre vient d'une adresse qu'on se copie entre collegues, et une faute de
 * frappe ne doit pas coûter l'ecran.
 */
function periodOf(raw: string | undefined): number {
  const days = Number(raw)
  return PERIODS.find((period) => period === days) ?? DEFAULT_PERIOD
}

/**
 * L'ecran des leads.
 *
 * Il repond a une seule question — la page de verification convainc-t-elle un
 * demandeur de reclamer l'attestation ? — et l'entonnoir la porte. La liste est
 * la pour agir sur ce qui reste ouvert, pas pour tenir un fichier : ni note, ni
 * etiquette, ni assignation.
 *
 * L'entonnoir se lit sur la periode choisie ; la liste, elle, l'ignore et
 * montre **tout ce qui est encore vivant**. Les deux ne repondent pas a la meme
 * question : l'un mesure ce qui s'est passe, l'autre dit ce qui reste a faire —
 * et une demande de quarante jours toujours sans reponse ne doit pas
 * disparaitre parce qu'on regarde la semaine.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ jours?: string }>
}) {
  try {
    await currentStaff()
  } catch (e) {
    if (e instanceof SessionError) notFound()
    throw e
  }

  const { jours } = await searchParams
  const period = periodOf(jours)

  const now = new Date()
  const from = new Date(now.getTime() - period * 86_400_000)

  const [counts, requests] = await Promise.all([leadFunnel(from, now), openRequests(now)])

  return (
    <AdminShell>
      <PageHeader
        title="Leads"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span>Sur</span>
            {PERIODS.map((days) =>
              days === period ? (
                /* La periode courante n'est pas un lien : un lien vers l'ecran
                   qu'on regarde deja n'apprend rien et se clique pour rien. */
                <Text key={days} as="span" size="sm">
                  <span aria-current="true" className="font-semibold">
                    {days} jours
                  </span>
                </Text>
              ) : (
                <Link key={days} href={`/leads?jours=${days}`}>
                  <span className="text-sm">{days} jours</span>
                </Link>
              ),
            )}
          </span>
        }
      />

      <Funnel counts={counts} />

      {/* L'export suit la periode affichee : on emporte ce qu'on regarde. */}
      <Link href={`/leads/export?jours=${period}`} tone="bare">
        <span className="text-sm">Exporter en CSV</span>
      </Link>

      {requests.length === 0 ? (
        <EmptyState
          title="Aucune demande en cours"
          description="Une liste vide est normale : une demande disparaît d’elle-même au bout de trente jours, quand ses contacts sont effacés. Ce qui compte de ces demandes-là reste compté dans l’entonnoir."
          action={
            <Link href="/attestations" tone="bare">
              <span className="text-sm">Voir la file des attestations</span>
            </Link>
          }
        />
      ) : (
        <RequestList requests={requests} now={now} />
      )}
    </AdminShell>
  )
}
