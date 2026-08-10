import { notFound } from 'next/navigation'
import { loadDisputeByToken } from '@/services/disputes'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
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

      {/*
        Trois cartes empilees separaient le client de sa question : il arrive
        d'un courriel pour repondre a UNE chose, et la traversait sur deux
        ecrans de telephone avant de la voir.

        L'ordre, lui, ne change pas et ne peut pas changer : les faits precedent
        le motif, et le motif precede la question — qui porte litteralement sur
        « cette explication ». Ce sont les boites qui partent, pas la logique.
      */}
      <div className="flex flex-col gap-2">
        <Text size="sm" tone="soft">
          Vous avez signé ce devis. À ce titre, votre signature sert à mesurer si{' '}
          {found.companyName} a tenu le délai qu’elle avait annoncé — c’est ce qui rend ce chiffre
          vérifiable plutôt que déclaratif.
        </Text>
        <Text size="sm" tone="soft">
          <strong>{found.companyName} conteste cette mesure</strong>, et vous êtes la seule
          personne à savoir ce qui s’est passé.
        </Text>
      </div>

      {/* Les faits, sans commentaire : ils precedent le motif de l'entreprise. */}
      <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        <Fact label="Devis signé le" value={found.signedOn} />
        <Fact label="Chantier terminé le" value={found.completedOn} />
        <Fact label="Délai annoncé" value={`${found.committedLeadTimeDays} jours ouvrés`} />
        <Fact label="Délai constaté" value={`${found.businessDaysUsed} jours ouvrés`} />
      </dl>

      <div className="flex flex-col gap-1 border-l-2 border-rule pl-4" data-testid="motif">
        {/* Sans le nom : « Ce que Entreprise explique » demanderait une elision. */}
        <Text size="label" tone="muted">
          L’explication de l’entreprise
        </Text>
        <Text size="sm">{found.reason}</Text>
      </div>

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

      {/*
        La mention d'information descend sous la reponse : elle doit etre
        atteignable, pas s'interposer entre le client et son geste.
      */}
      <Text size="sm" tone="muted">
        <Link href="/confidentialite" newTab>
          Comment vos données sont utilisées
        </Link>
      </Text>
    </PublicShell>
  )
}

/** Un fait du dossier : l'intitule au-dessus, la valeur en dessous. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-rule pb-2">
      <Text size="label" tone="muted" as="dt">
        {label}
      </Text>
      <Text size="sm" as="dd">
        {value}
      </Text>
    </div>
  )
}
