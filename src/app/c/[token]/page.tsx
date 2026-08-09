import { notFound } from 'next/navigation'
import { loadDisputeByToken } from '@/services/disputes'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { PublicShell } from '@/ui/shells/public-shell'
import { ArbitrationForm } from './ArbitrationForm'

/**
 * L'arbitrage, vu par le client. Sans compte.
 *
 * C'est **lui** qui tranche, parce qu'il a co-signe le devis : il est le temoin
 * qui authentifie la mesure, donc le temoin naturel du desaccord. Une revue
 * interne aurait fait de nous le juge de nos propres chiffres.
 *
 * L'encart d'information n'est pas une precaution de forme : le client ignore
 * qu'il joue un role de temoin, et l'AIPD exige qu'on le lui dise. C'est ici
 * qu'il l'apprend — l'ecran de signature reste a traiter.
 */
export default async function ArbitrationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await loadDisputeByToken(token, new Date())

  if (!found) notFound()

  return (
    <PublicShell>
      <div className="flex flex-col gap-1">
        <Heading level={1}>Une question sur le chantier {found.quoteNumber}</Heading>
        <Text size="sm" tone="muted">
          {found.companyName}
        </Text>
      </div>

      <Card elevation="flat">
        <div className="flex flex-col gap-2">
          <Text size="sm" tone="soft">
            Vous avez signé ce devis. À ce titre, votre signature sert à mesurer si{' '}
            {found.companyName} a tenu le délai qu’elle avait annoncé — c’est ce qui rend ce
            chiffre vérifiable plutôt que déclaratif.
          </Text>
          <Text size="sm" tone="soft">
            <strong>{found.companyName} conteste cette mesure</strong>, et vous êtes la seule
            personne à savoir ce qui s’est passé.
          </Text>
          <Text size="sm" tone="muted">
            <Link href="/confidentialite" newTab>
              Comment vos données sont utilisées
            </Link>
          </Text>
        </div>
      </Card>

      {/* Les faits, sans commentaire : ils precedent le motif de l'entreprise. */}
      <Card elevation="e1">
        <dl className="flex flex-col gap-2">
          <div className="flex flex-wrap justify-between gap-2">
            <Text size="sm" tone="muted" as="dt">
              Devis signé le
            </Text>
            <Text size="sm" as="dd">
              {found.signedOn}
            </Text>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <Text size="sm" tone="muted" as="dt">
              Chantier terminé le
            </Text>
            <Text size="sm" as="dd">
              {found.completedOn}
            </Text>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <Text size="sm" tone="muted" as="dt">
              Délai annoncé
            </Text>
            <Text size="sm" as="dd">
              {found.committedLeadTimeDays} jours ouvrés
            </Text>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <Text size="sm" tone="muted" as="dt">
              Délai constaté
            </Text>
            <Text size="sm" as="dd">
              {found.businessDaysUsed} jours ouvrés
            </Text>
          </div>
        </dl>
      </Card>

      <Card elevation="flat">
        <div className="flex flex-col gap-1" data-testid="motif">
          {/* Sans le nom : « Ce que Entreprise explique » demanderait une elision. */}
          <Text size="label" tone="muted">
            L’explication de l’entreprise
          </Text>
          <Text size="sm">{found.reason}</Text>
        </div>
      </Card>

      <section className="flex flex-col gap-4">
        {/*
          La question porte sur l'explication citee juste au-dessus, et les deux
          reponses lui repondent litteralement. Une question posee autrement —
          « ce retard est-il imputable a l'entreprise ? » — ferait dire « oui » a
          un client d'accord avec elle, et le sens s'inverserait.
        */}
        <Heading level={3} as="h2">
          Cette explication correspond-elle à ce qui s’est passé ?
        </Heading>

        {found.standing === 'under_review' ? (
          <ArbitrationForm token={token} />
        ) : (
          <div data-testid="reponse-enregistree">
            <Text tone="soft">
              {found.standing === 'settled'
                ? 'Le délai de réponse est passé, ou cette question a déjà été tranchée. La mesure initiale s’applique.'
                : 'Vous avez déjà répondu à cette question. Vous n’avez rien d’autre à faire.'}
            </Text>
          </div>
        )}
      </section>
    </PublicShell>
  )
}
