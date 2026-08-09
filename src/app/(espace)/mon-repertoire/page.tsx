import { redirect } from 'next/navigation'
import { asc } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity } from '@/db/schema'
import { currentRequester, SessionError } from '@/lib/session'
import { addressBookFor, type BookEntry } from '@/services/address-book'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { SpaceShell } from '@/ui/shells/space-shell'
import { AddEntryForm } from './AddEntryForm'

/**
 * Le repertoire du demandeur.
 *
 * Le meilleur objet de retention de P1 : le dossier se consulte rarement, le
 * repertoire sert a chaque probleme. Et c'est lui qui fait vivre le label apres
 * la vente — l'etat de verification affiche est celui d'aujourd'hui.
 */
export default async function AddressBookPage() {
  let session
  try {
    session = await currentRequester()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucun dossier') ? '/' : '/connexion')
    }
    throw e
  }

  const [book, activities] = await Promise.all([
    addressBookFor(session.requesterId, new Date()),
    db.select({ code: activity.code, label: activity.label }).from(activity).orderBy(asc(activity.label)),
  ])

  const known = book.filter((entry) => entry.kind === 'company')
  const typed = book.filter((entry) => entry.kind === 'manual')

  return (
    <SpaceShell>
      <div className="flex flex-col gap-1">
        <Heading level={1}>Mon répertoire</Heading>
        <Text size="sm" tone="soft">
          Les entreprises déjà intervenues chez vous, et celles que vous ajoutez.
        </Text>
      </div>

      <div className="flex flex-col gap-4" data-testid="repertoire">
        {known.map((entry) => (
          <KnownCompany key={entry.kind === 'company' ? entry.companyId : ''} entry={entry} />
        ))}

        {typed.length > 0 && (
          <>
            <Text size="label" tone="muted">
              Ajoutées par vous
            </Text>
            {/*
              Cette phrase n'est pas une precaution : sans elle, les deux
              sections se lisent comme une seule liste et la verification
              semblerait s'etendre a tout le carnet.
            */}
            <Text size="sm" tone="muted">
              Vous avez ajouté ces entreprises vous-même.{' '}
              <strong>Nous ne les avons pas vérifiées, et nous ne les avons pas prévenues.</strong>
            </Text>
            {typed.map((entry) => (
              <TypedCompany key={entry.kind === 'manual' ? entry.id : ''} entry={entry} />
            ))}
          </>
        )}

        {book.length === 0 && (
          <Text tone="soft">
            Votre répertoire se remplit dès qu’une entreprise intervient chez vous.
          </Text>
        )}
      </div>

      <AddEntryForm activities={activities} />

      <div className="mt-2">
        <Link href="/mes-logements" tone="bare">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Icon name="back" />
            Retour à mes logements
          </span>
        </Link>
      </div>
    </SpaceShell>
  )
}

function KnownCompany({ entry }: { entry: BookEntry }) {
  if (entry.kind !== 'company') return null

  const { covered = [], lapsed = [], passportPath = null } = entry.coverage ?? {}

  return (
    <Card elevation="e1">
      <div className="flex flex-col gap-2">
        <Heading level={3} as="h2">
          {entry.name}
        </Heading>

        <Text size="sm" tone="soft">
          Dernière intervention : {entry.lastChantier.label},{' '}
          {entry.lastChantier.at.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          {entry.interventions > 1 && ` · ${entry.interventions} interventions`}
        </Text>

        {/* Les trois cas, et le troisieme compte autant que les deux autres. */}
        {covered.length > 0 ? (
          <Text size="sm" tone="soft">
            Assurée aujourd’hui pour : {covered.join(', ')}.
          </Text>
        ) : lapsed.length > 0 ? (
          <div className="rounded-card border border-danger bg-danger-bg px-4 py-3">
            <Text size="sm" as="span">
              <strong>Attestation expirée</strong> pour : {lapsed.join(', ')}.
            </Text>
          </div>
        ) : (
          <Text size="sm" tone="muted">
            Cette entreprise n’a déclaré aucune activité vérifiée.
          </Text>
        )}

        <div className="flex flex-wrap gap-4">
          <Link href={`/mon-repertoire/${entry.companyId}`}>Recontacter</Link>
          {passportPath && (
            <Link href={passportPath} newTab>
              Voir son passeport
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}

function TypedCompany({ entry }: { entry: BookEntry }) {
  if (entry.kind !== 'manual') return null

  return (
    <Card elevation="flat">
      <div className="flex flex-col gap-1">
        <Heading level={3} as="h2">
          {entry.name}
        </Heading>
        {entry.activityLabel && (
          <Text size="sm" tone="muted">
            {entry.activityLabel}
          </Text>
        )}
        {entry.phone && <Text size="sm">{entry.phone}</Text>}
        {entry.note && (
          <Text size="sm" tone="soft">
            {entry.note}
          </Text>
        )}
      </div>
    </Card>
  )
}
