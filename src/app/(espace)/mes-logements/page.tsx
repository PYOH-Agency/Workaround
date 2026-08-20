import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { member } from '@/db/schema'
import { currentRequester, SessionError } from '@/lib/session'
import { myProperties } from '@/services/my-properties'
import { dismissedNotes } from '@/services/screen-notes'
import { Badge } from '@/ui/atoms/badge'
import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { EmptyState } from '@/ui/molecules/empty-state'
import { PageHeader } from '@/ui/molecules/page-header'
import { Rail, RailItem } from '@/ui/molecules/rail'
import { ScreenNote } from '@/ui/molecules/screen-note'
import { SpaceShell } from '@/ui/shells/space-shell'

/**
 * L'accueil du demandeur.
 *
 * L'unite n'est pas « ma demande » mais **« mon logement »** — un bailleur voit
 * son parc, un occupant voit son bien. Et ce qu'il voit se deduit des devis
 * qu'il a SIGNES, jamais de ce qui est arrive a l'adresse.
 */
export default async function MyPropertiesPage() {
  let session
  try {
    session = await currentRequester()
  } catch (e) {
    if (e instanceof SessionError) {
      // « Aucun dossier » n'envoie PAS vers l'inscription artisan : ce compte
      // n'est pas un artisan qui n'aurait pas fini, c'est quelqu'un qui n'a
      // simplement rien signe.
      redirect(e.message.includes('Aucun dossier') ? '/' : '/connexion')
    }
    throw e
  }

  const [properties, company] = await Promise.all([
    myProperties(session.requesterId),
    db.query.member.findFirst({ where: eq(member.userId, session.userId) }),
  ])

  return (
    <SpaceShell alsoCompany={company !== undefined}>
      {/* La page passe SA cle — le catalogue ne sait pas quel ecran porte quoi. */}
      <ScreenNote note="mes-logements" dismissed={await dismissedNotes(session.userId)} />

      <PageHeader
        title="Mes logements"
        subtitle="Les chantiers que vous avez signés, regroupés par adresse."
      />

      {properties.length === 0 ? (
        <EmptyState
          title="Aucun chantier pour le moment"
          description="Votre dossier se remplit dès que vous signez un devis."
          action={
            <ButtonLink href="/annuaire" tone="secondary">
              Chercher une entreprise
            </ButtonLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {properties.map((item) => (
            <section key={item.id} className="flex flex-col gap-2" data-testid={`logement-${item.id}`}>
              <Heading level={3} as="h2">
                {item.address}
              </Heading>

              {/*
                Sur la regle et non en cartes : les chantiers d'une adresse sont
                une suite, et l'etat de chacun se lit desormais en pastille
                plutot qu'a la fin d'une phrase suivie — « en cours » y etait le
                dernier mot d'une ligne de quatre informations.
              */}
              <Rail as="ul">
                {item.chantiers.map((chantier) => (
                  <RailItem key={chantier.quoteId} current={chantier.completedAt === null}>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      {/* Souligne, et non `bare` : c'est la porte du dossier de
                          chantier, et rien d'autre sur la ligne ne l'ouvre. */}
                      <Link href={`/mes-chantiers/${chantier.quoteId}`}>
                        <strong className="text-sm">{chantier.companyName}</strong>
                      </Link>

                      {chantier.completedAt ? (
                        <Badge tone="neutral" icon={<Icon name="check" size="sm" />}>
                          Terminé le {chantier.completedAt.toLocaleDateString('fr-FR')}
                        </Badge>
                      ) : (
                        <Badge tone="warning" icon={<Icon name="clock" size="sm" />}>
                          En cours
                        </Badge>
                      )}
                    </div>

                    <Text size="sm" tone="muted">
                      Devis {chantier.number} · signé le{' '}
                      {chantier.signedAt.toLocaleDateString('fr-FR')}
                    </Text>
                  </RailItem>
                ))}
              </Rail>
            </section>
          ))}
        </div>
      )}

      <Text size="sm" tone="soft">
        <Link href="/mon-repertoire">Mon répertoire</Link> — les entreprises déjà intervenues chez
        vous, et où en est leur vérification aujourd’hui.
      </Text>

      <Text size="sm" tone="muted">
        Ouvrez un chantier pour son suivi, ses documents et vos garanties.{' '}
        <Link href="/confidentialite" newTab>
          Comment vos données sont utilisées
        </Link>
      </Text>
    </SpaceShell>
  )
}
