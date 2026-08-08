import { notFound } from 'next/navigation'
import { trackedPassport } from '@/services/passport'
import { loadQuoteByToken } from '@/services/quote-public'
import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { Link } from '@/ui/atoms/link'
import { Card } from '@/ui/molecules/card'
import { SealBadge } from '@/ui/molecules/seal-badge'
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

      {/*
        Le sceau se pose ici, entre l'identite de l'entreprise et son offre :
        c'est l'ordre dans lequel le client se pose les questions — qui est-ce,
        qu'a-t-on verifie chez eux, que me proposent-ils.

        L'adresse affichee reste nue : c'est celle qu'on recopie depuis un ecran
        photographie. Le lien, lui, dit d'ou l'on vient — meme page au bout,
        `?via=` n'existe que pour la mesure. Il s'ouvre dans un onglet : quitter
        cette page couterait un nouveau code SMS, donc une signature.
      */}
      {found.company.passport && (
        <Link href={trackedPassport(found.company.passport.url, 'devis')} tone="bare">
          <SealBadge
            activities={found.company.passport.activities.join(', ')}
            passportUrl={found.company.passport.url}
          />
        </Link>
      )}

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
          className="flex items-center gap-3 rounded-card border border-verified bg-verified-bg px-5 py-4 text-verified"
        >
          <Icon name="check" />
          <Text as="span">
            <strong>Devis signé.</strong>
          </Text>
        </div>
      ) : found.status === 'sent' && found.customer.phone ? (
        <SignatureBlock token={token} phoneHint={maskPhone(found.customer.phone)} />
      ) : null}
    </PublicShell>
  )
}
