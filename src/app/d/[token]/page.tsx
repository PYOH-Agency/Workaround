import { notFound } from 'next/navigation'
import { loadQuoteByToken } from '@/services/quote-public'
import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { Notice } from '@/ui/molecules/notice'
import { LegalMentionsPanel, mention } from '@/ui/organisms/legal-mentions-panel'
import { QuoteLinesTable } from '@/ui/organisms/quote-lines-table'
import { TotalsPanel } from '@/ui/organisms/totals-panel'
import { PublicShell } from '@/ui/shells/public-shell'
import { SignatureBlock } from './SignatureBlock'

/** On ne reaffiche jamais le numero en entier : la page est publique. */
const maskPhone = (phone: string) => `${phone.slice(0, 2)} •• •• •• ${phone.slice(-2)}`

/**
 * Vue publique d'un devis, accessible sans compte.
 *
 * Le jeton fait office d'autorisation : le demandeur n'a pas de compte en M1.
 */
export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const found = await loadQuoteByToken(token)

  if (!found) notFound()

  const legal = found.company.legal

  return (
    <PublicShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={1}>Devis {found.number}</Heading>
          <Text size="sm" tone="muted">
            Émis le {found.issuedOn}
          </Text>
        </div>
        <ButtonLink href={`/d/${token}/pdf`} tone="secondary">
          Télécharger le PDF
        </ButtonLink>
      </header>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <Heading level={3} as="h2">
            {found.company.legalName}
          </Heading>
          <Text size="sm" tone="soft">
            SIRET {found.company.siret}
          </Text>
          <Text size="sm" tone="soft">
            {found.company.address}
          </Text>
        </div>
        <div className="flex flex-col gap-0.5">
          <Heading level={3} as="h2">
            {found.customer.name}
          </Heading>
          <Text size="sm" tone="soft">
            Chantier : {found.customer.propertyAddress}
          </Text>
        </div>
      </section>

      <Card elevation="e1">
        <QuoteLinesTable lines={found.lines} />
        <div className="mt-6">
          <TotalsPanel totals={found.totals} />
        </div>
      </Card>

      {found.committedLeadTimeDays !== null && (
        <Text size="sm" tone="soft">
          Délai d’exécution engagé : {found.committedLeadTimeDays} jours ouvrés à compter de
          l’acceptation.
        </Text>
      )}

      <section className="flex flex-col gap-1">
        <Text size="sm" tone="soft">
          Validité de cette offre : {found.validityDays} jours à compter de son émission.
        </Text>
        <Text size="sm" tone="soft">
          Modalités de paiement : {legal.paymentTerms}
        </Text>
      </section>

      {/*
        Un artisan qui fait signer chez son client conclut un contrat hors
        etablissement : omettre cette mention porte le delai de retractation de
        quatorze jours a douze mois.
      */}
      {found.customer.isIndividual && (
        <Card elevation="flat">
          <div className="flex flex-col gap-1">
            <Text size="label" tone="muted">
              Droit de rétractation
            </Text>
            <Text size="sm" tone="soft">
              Pour un contrat conclu hors établissement, vous disposez d’un délai de quatorze jours
              à compter de votre acceptation pour vous rétracter, sans avoir à motiver votre
              décision. Si vous demandez expressément que les travaux commencent avant la fin de ce
              délai, vous restez redevable des prestations déjà réalisées.
            </Text>
          </div>
        </Card>
      )}

      <LegalMentionsPanel
        legalName={found.company.legalName}
        legalFormLabel={mention(legal.legalFormLabel, 'forme juridique')}
        registrationNumber={mention(legal.registrationNumber, 'immatriculation')}
        siret={found.company.siret}
        vatLine={
          legal.vatExempt
            ? 'TVA non applicable, art. 293 B du CGI'
            : `TVA ${mention(legal.vatNumber, 'numéro de TVA')}`
        }
        phone={mention(legal.phone, 'téléphone')}
        email={mention(legal.email, 'e-mail')}
        insurerName={mention(legal.insurerName, 'nom de l’assureur')}
        insurerAddress={mention(legal.insurerAddress, 'adresse de l’assureur')}
        policyNumber={mention(legal.policyNumber, 'référence du contrat')}
        coveredActivities={mention(legal.coveredActivities, 'activités garanties')}
        coverageArea={mention(legal.coverageArea, 'zone géographique')}
      />

      {found.status === 'signed' ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-card border border-verified bg-verified-bg px-5 py-4 text-verified"
        >
          <Icon name="check" />
          <div className="flex flex-col gap-2">
            <Text as="span">
              <strong>Devis signé.</strong>
            </Text>
            {/*
              Le MEME message qu'apres la signature, et c'est ici qu'il compte
              le plus : ce bloc est ce qu'on voit en rouvrant le lien plus tard,
              justement quand on se demande ou en est le chantier. Le porter
              seulement dans `SignatureBlock` le reservait a la minute qui suit
              la signature — le moment ou l'on y pense le moins.

              Aucun bouton, aucun champ, aucune creation de compte (spec A2 §6).
            */}
            <Text as="span" size="sm" tone="soft">
              Vous pourrez suivre ce chantier — les photos, l’avancement, la réception — sur votre
              espace. Le lien est dans le courriel.
            </Text>
          </div>
        </div>
      ) : found.status === 'sent' && found.customer.phone ? (
        <SignatureBlock token={token} phoneHint={maskPhone(found.customer.phone)} />
      ) : found.status === 'sent' ? (
        /*
          `sent` sans telephone : la signature passe par un code SMS, et il n'y
          a nulle part ou l'envoyer. Sans ce message, la page rendait `null` —
          le client voyait un devis complet, aucun bouton, et aucune raison. Un
          cul-de-sac muet sur l'ecran meme ou se gagne la signature. On nomme
          l'obstacle et on donne la sortie : recontacter l'entreprise.
        */
        <Notice tone="warning">
          <Text as="span" size="sm">
            Ce devis ne peut pas être signé depuis ce lien : la signature se fait par un code envoyé
            par SMS, et aucun numéro de mobile n’y est rattaché. Contactez{' '}
            <strong>{found.company.legalName}</strong>
            {legal.email ? (
              <>
                {' '}
                (<Link href={`mailto:${legal.email}`}>{legal.email}</Link>)
              </>
            ) : null}{' '}
            pour recevoir un lien signable.
          </Text>
        </Notice>
      ) : null}
    </PublicShell>
  )
}
