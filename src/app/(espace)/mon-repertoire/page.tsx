import { redirect } from 'next/navigation'
import { asc } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity } from '@/db/schema'
import { currentRequester, SessionError } from '@/lib/session'
import { addressBookFor, type BookEntry } from '@/services/address-book'
import { dismissedNotes } from '@/services/screen-notes'
import { Badge } from '@/ui/atoms/badge'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { DataTable, type TableRow } from '@/ui/organisms/data-table'
import { Notice } from '@/ui/molecules/notice'
import { PageHeader } from '@/ui/molecules/page-header'
import { ScreenNote } from '@/ui/molecules/screen-note'
import { SpaceShell } from '@/ui/shells/space-shell'
import { AddEntryForm } from './AddEntryForm'

const MONTH = { month: 'long', year: 'numeric' } as const

/**
 * Le repertoire du demandeur.
 *
 * Le meilleur objet de retention de P1 : le dossier se consulte rarement, le
 * repertoire sert a chaque probleme. Et c'est lui qui fait vivre le label apres
 * la vente — l'etat de verification affiche est celui d'aujourd'hui.
 *
 * **En tableau depuis la reprise des treize ecrans.** La question qu'on pose a
 * cet ecran est « laquelle a une attestation expiree ? », et six cartes
 * empilees obligeaient a relire six paragraphes pour y repondre. Une colonne y
 * repond d'un balayage.
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
    <SpaceShell layout="wide">
      {/* La page passe SA cle — le catalogue ne sait pas quel ecran porte quoi. */}
      <ScreenNote note="mon-repertoire" dismissed={await dismissedNotes(session.userId)} />

      <PageHeader
        back={{ href: '/mes-logements', label: 'Retour à mes logements' }}
        title="Mon répertoire"
        subtitle="Les entreprises déjà intervenues chez vous, et celles que vous ajoutez."
      />

      <div className="flex flex-col gap-8" data-testid="repertoire">
        {known.length > 0 && (
          <DataTable
            caption="Les entreprises déjà intervenues chez vous, et leur assurance aujourd’hui"
            columns={[
              { label: 'Entreprise' },
              { label: 'Dernière intervention' },
              { label: 'Assurance aujourd’hui' },
              { label: 'Action', hideLabel: true, align: 'right' },
            ]}
            rows={known.map(knownRow)}
          />
        )}

        {typed.length > 0 && (
          <section className="flex flex-col gap-3">
            <Text size="label" tone="muted" as="h2">
              Ajoutées par vous
            </Text>

            {/*
              En `Notice` laiton, et non plus en `tone="muted"`.

              C'etait la mise en garde la plus importante de la page, rendue
              dans le ton le plus efface du systeme — moins visible que la
              phrase d'aide du titre. Sans `alert` : elle est permanente, et un
              lecteur d'ecran n'a pas a en etre interrompu a chaque rendu.
            */}
            <Notice tone="warning">
              Vous avez ajouté ces entreprises vous-même.{' '}
              <strong>Nous ne les avons pas vérifiées, et nous ne les avons pas prévenues.</strong>
            </Notice>

            <DataTable
              caption="Les entreprises que vous avez ajoutées vous-même"
              columns={[
                { label: 'Entreprise' },
                { label: 'Métier' },
                { label: 'Téléphone' },
                { label: 'Note' },
              ]}
              rows={typed.map(typedRow)}
            />
          </section>
        )}

        {book.length === 0 && (
          <Text tone="soft">
            Votre répertoire se remplit dès qu’une entreprise intervient chez vous.
          </Text>
        )}
      </div>

      <AddEntryForm activities={activities} />

      {/*
        `/verifier` n'etait liee nulle part depuis l'espace du demandeur : la
        seule facon d'y arriver etait la page d'accueil publique. C'est ici
        qu'on en a besoin — au moment ou l'on regarde qui est assure.
      */}
      <Text size="sm" tone="muted">
        Une entreprise qui n’est pas dans cette liste ?{' '}
        <Link href="/verifier">Vérifier une entreprise</Link> par son SIRET.
      </Text>
    </SpaceShell>
  )
}

/** Les trois cas de couverture, et le troisieme compte autant que les deux autres. */
function coverage(entry: Extract<BookEntry, { kind: 'company' }>): React.ReactNode {
  const { covered = [], lapsed = [] } = entry.coverage ?? {}

  if (covered.length > 0) {
    return (
      <Badge tone="verified" icon={<Icon name="check" size="sm" />}>
        Assurée pour {covered.join(', ')}
      </Badge>
    )
  }

  if (lapsed.length > 0) {
    return (
      <Badge tone="danger" icon={<Icon name="alert" size="sm" />}>
        Attestation expirée — {lapsed.join(', ')}
      </Badge>
    )
  }

  return (
    <Badge tone="neutral" icon={<Icon name="clock" size="sm" />}>
      Aucune activité vérifiée
    </Badge>
  )
}

function knownRow(entry: BookEntry): TableRow {
  if (entry.kind !== 'company') return { id: '', cells: [] }
  const passportPath = entry.coverage?.passportPath ?? null

  return {
    id: entry.companyId,
    cells: [
      <div key="who" className="flex flex-col gap-0.5">
        <Text as="span">{entry.name}</Text>
        {entry.interventions > 1 && (
          <Text size="sm" tone="muted" as="span">
            {entry.interventions} interventions
          </Text>
        )}
      </div>,
      <div key="last" className="flex flex-col gap-0.5">
        <Text size="sm" as="span">
          {entry.lastChantier.label}
        </Text>
        <Text size="sm" tone="muted" as="span">
          {entry.lastChantier.at.toLocaleDateString('fr-FR', MONTH)}
        </Text>
      </div>,
      coverage(entry),
      <div key="do" className="flex flex-wrap justify-end gap-x-4 gap-y-1">
        <Link href={`/mon-repertoire/${entry.companyId}`}>Recontacter</Link>
        {passportPath && (
          <Link href={passportPath} newTab>
            Son passeport
          </Link>
        )}
      </div>,
    ],
  }
}

function typedRow(entry: BookEntry): TableRow {
  if (entry.kind !== 'manual') return { id: '', cells: [] }

  return {
    id: entry.id,
    cells: [
      <Text key="who" as="span">
        {entry.name}
      </Text>,
      <Text key="job" size="sm" tone="muted" as="span">
        {entry.activityLabel ?? '—'}
      </Text>,
      entry.phone ? (
        <Link key="tel" href={`tel:${entry.phone}`}>
          {entry.phone}
        </Link>
      ) : (
        <Text key="tel" size="sm" tone="muted" as="span">
          —
        </Text>
      ),
      <Text key="note" size="sm" tone="soft" as="span">
        {entry.note ?? '—'}
      </Text>,
    ],
  }
}
