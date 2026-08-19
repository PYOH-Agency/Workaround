import type { OpenRequest } from '@/services/lead-metrics'
import { Badge } from '@/ui/atoms/badge'
import { Icon, type IconName } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { DataTable } from '@/ui/organisms/data-table'
import { RelaunchButton } from './RelaunchButton'

type Status = 'covered' | 'reviewing' | 'registered' | 'silent'

const LABELS: Record<Status, string> = {
  covered: 'Couverture publiée',
  reviewing: 'Attestation en revue',
  registered: 'Inscrit sans dépôt',
  silent: 'Sans réponse',
}

/** La couleur ne porte jamais seule l'information : le mot et l'icone la doublent. */
const TONES: Record<Status, 'verified' | 'warning' | 'neutral'> = {
  covered: 'verified',
  reviewing: 'warning',
  registered: 'neutral',
  silent: 'neutral',
}

const ICONS: Record<Status, IconName> = {
  covered: 'check',
  reviewing: 'clock',
  registered: 'document',
  silent: 'clock',
}

const CHANNELS = { sent: 'Envoyée par nous', copied: 'Copiée par le demandeur' } as const

/**
 * Le statut se **calcule a la lecture**, a partir des trois jalons.
 *
 * Aucun statut n'est stocke : une colonne « statut » exigerait d'etre reecrite
 * a chaque jalon franchi, et une ecriture manquee laisserait une demande
 * affichee « sans reponse » alors que sa couverture est publiee. Les jalons se
 * lisent dans l'ordre inverse de leur survenue — le plus avance gagne.
 */
function statusOf(request: OpenRequest): Status {
  if (request.coveredAt) return 'covered'
  if (request.depositedAt) return 'reviewing'
  if (request.registeredAt) return 'registered'
  return 'silent'
}

const days = (since: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - since.getTime()) / 86_400_000))

/**
 * Les demandes encore vivantes.
 *
 * Ni note, ni etiquette, ni assignation : ce n'est pas un CRM. La liste se vide
 * d'elle-meme a 30 jours, quand l'anonymisation retire les contacts — c'est
 * l'effet recherche, et rien ici ne cherche a le retarder.
 */
export function RequestList({ requests, now }: { requests: OpenRequest[]; now: Date }) {
  return (
    <DataTable
      testId="liste-demandes"
      caption="Les demandes d’attestation encore vivantes"
      columns={[
        { label: 'Entreprise' },
        { label: 'Canal' },
        { label: 'Âge', align: 'right' },
        { label: 'Statut' },
        { label: 'Relance', hideLabel: true },
      ]}
      rows={requests.map((request) => {
        const status = statusOf(request)

        /**
         * Une relance a besoin d'un SIRET et d'une adresse d'artisan. Le canal
         * `copied` n'en a jamais eu — le demandeur a transmis lui-meme — et une
         * ligne videe de son SIRET n'a plus rien a quoi ecrire. Proposer le
         * bouton la reviendrait a promettre un envoi qui ne peut pas partir.
         */
        const relaunchable = request.siret !== null && request.channel === 'sent'

        return {
          id: request.id,
          cells: [
            /* Une demande anonymisee n'apparait pas ici, mais le SIRET reste
               nullable en base : rien ne doit produire un lien vers `/null`. */
            request.siret ? (
              <Link key="who" href={`/verification/${request.siret}`}>
                <span className="tabular-nums">{request.siret}</span>
              </Link>
            ) : (
              <Text key="who" as="span" size="sm" tone="muted">
                SIRET retiré
              </Text>
            ),
            <Text key="channel" as="span" size="sm" tone="muted">
              {CHANNELS[request.channel]}
            </Text>,
            <Text key="age" as="span" size="sm" tone="muted">
              <span className="tabular-nums">{days(request.requestedAt, now)} j</span>
            </Text>,
            <Badge
              key="status"
              tone={TONES[status]}
              icon={<Icon name={ICONS[status]} size="sm" />}
            >
              {LABELS[status]}
            </Badge>,
            relaunchable ? (
              <RelaunchButton key="relaunch" id={request.id} />
            ) : (
              <Text key="relaunch" as="span" size="sm" tone="muted">
                Rien à relancer
              </Text>
            ),
          ],
        }
      })}
    />
  )
}
