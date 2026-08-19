import { SessionError } from '@/lib/session'
import { currentStaff } from '@/lib/staff-session'
import { toCsv } from '@/domain/csv'
import { leadFunnel, openRequests } from '@/services/lead-metrics'

export const runtime = 'nodejs'

const PERIODS = [7, 30, 90] as const
const DEFAULT_PERIOD = 30

function periodOf(raw: string | null): number {
  const days = Number(raw)
  return PERIODS.find((period) => period === days) ?? DEFAULT_PERIOD
}

const iso = (date: Date | null) => date?.toISOString() ?? ''

/**
 * L'export CSV de l'entonnoir et des demandes ouvertes.
 *
 * **C'est la seule couture vers l'exterieur, et elle est pauvre exprès.** Pas
 * de synchronisation vers un CRM : la valeur d'un CRM est de se souvenir pour
 * toujours, et tout le dispositif tient sur l'oubli — demandes anonymisees a
 * 30 jours, recherches purgees a 12 mois. Une synchronisation creerait une
 * copie permanente hors de notre controle, plus un sous-traitant, un DPA et
 * une AIPD a rouvrir. Un export a la demande couvre le besoin reel sans rien
 * de tout cela.
 *
 * **Aucune adresse n'y figure, et ce n'est pas un oubli.** `openRequests` n'en
 * rend aucune : la garantie est posee en amont, dans le service, plutot que
 * dans la mise en forme — un fichier pose sur un disque, lui, ne s'anonymise
 * pas a 30 jours. Le SIRET suffit a agir, puisque relancer se fait depuis
 * l'ecran et non depuis le tableur.
 */
export async function GET(request: Request) {
  try {
    await currentStaff()
  } catch (e) {
    // Meme reponse que les ecrans admin : un non-relecteur n'apprend pas que
    // cette route existe.
    if (e instanceof SessionError) return new Response('Introuvable', { status: 404 })
    throw e
  }

  const days = periodOf(new URL(request.url).searchParams.get('jours'))
  const now = new Date()
  const from = new Date(now.getTime() - days * 86_400_000)

  const [counts, requests] = await Promise.all([leadFunnel(from, now), openRequests(now)])

  const csv = [
    toCsv(
      ['mesure', 'valeur'],
      Object.entries(counts).map(([key, value]) => [key, String(value)]),
    ),
    toCsv(
      ['siret', 'canal', 'demandee_le', 'inscrite_le', 'deposee_le', 'couverte_le'],
      requests.map((row) => [
        row.siret ?? '',
        row.channel,
        iso(row.requestedAt),
        iso(row.registeredAt),
        iso(row.depositedAt),
        iso(row.coveredAt),
      ]),
    ),
  ].join('\r\n')

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="leads-${days}j.csv"`,
    },
  })
}
