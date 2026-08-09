import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { member } from '@/db/schema'
import { currentRequester, SessionError } from '@/lib/session'
import { myProperties } from '@/services/my-properties'
import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { EmptyState } from '@/ui/molecules/empty-state'
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
      <div className="flex flex-col gap-1">
        <Heading level={1}>Mes logements</Heading>
        <Text size="sm" tone="soft">
          Les chantiers que vous avez signés, regroupés par adresse.
        </Text>
      </div>

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
        <div className="flex flex-col gap-4">
          {properties.map((item) => (
            <Card key={item.id} elevation="e1">
              <div className="flex flex-col gap-3" data-testid={`logement-${item.id}`}>
                <Heading level={3} as="h2">
                  {item.address}
                </Heading>
                <ul className="flex flex-col gap-2">
                  {item.chantiers.map((chantier) => (
                    <li key={chantier.quoteId}>
                      <Text size="sm" tone="soft" as="span">
                        <strong>{chantier.companyName}</strong> · devis {chantier.number} · signé
                        le {chantier.signedAt.toLocaleDateString('fr-FR')}
                        {chantier.completedAt
                          ? ` · terminé le ${chantier.completedAt.toLocaleDateString('fr-FR')}`
                          : ' · en cours'}
                      </Text>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/*
        Honnetete de perimetre, pas excuse : le dossier complet — fil
        d'avancement, documents, garanties — arrive au plan B. Laisser croire
        qu'il est deja la ferait chercher une page qui n'existe pas.
      */}
      <Text size="sm" tone="muted">
        Vos devis et vos factures restent accessibles par les liens que vos entreprises vous ont
        envoyés.{' '}
        <Link href="/confidentialite" newTab>
          Comment vos données sont utilisées
        </Link>
      </Text>
    </SpaceShell>
  )
}
