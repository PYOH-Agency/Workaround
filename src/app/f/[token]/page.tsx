import { notFound } from 'next/navigation'
import { loadInvoiceByToken } from '@/services/invoice-public'
import { TYPE_LABELS } from '@/pdf/invoice-pdf'
import { ButtonLink } from '@/ui/atoms/button-link'
import { DateText } from '@/ui/atoms/date-text'
import { Heading } from '@/ui/atoms/heading'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { StatusBadge } from '@/ui/molecules/status-badge'
import { SummaryLine } from '@/ui/molecules/summary-line'
import { LegalMentionsPanel, mention } from '@/ui/organisms/legal-mentions-panel'
import { QuoteLinesTable } from '@/ui/organisms/quote-lines-table'
import { TotalsPanel } from '@/ui/organisms/totals-panel'
import { PublicShell } from '@/ui/shells/public-shell'

/**
 * Vue publique d'une facture, accessible sans compte.
 *
 * Le jeton fait office d'autorisation, comme pour le devis. Aucune action n'est
 * possible ici : une facture ne se signe pas, elle se paie.
 */
export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const found = await loadInvoiceByToken(token)

  if (!found) notFound()

  const legal = found.company.legal

  return (
    <PublicShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={1}>
            {TYPE_LABELS[found.type]} <span data-testid="numero-facture">{found.number}</span>
          </Heading>
          <Text size="sm" tone="muted">
            Émise le {found.issuedOn} · Échéance le {found.dueOn}
          </Text>
        </div>
        <ButtonLink href={`/f/${token}/pdf`} tone="secondary">
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
          {found.customer.siret && (
            <Text size="sm" tone="soft">
              SIRET {found.customer.siret}
            </Text>
          )}
          <Text size="sm" tone="soft">
            Chantier : {found.customer.propertyAddress}
          </Text>
        </div>
      </section>

      <Card elevation="e1">
        <QuoteLinesTable lines={found.lines} />
        <div className="mt-6 flex flex-col">
          <TotalsPanel totals={found.totals} />
          <div className="ml-auto w-full max-w-xs">
            <SummaryLine
              label="Reste dû"
              cents={found.outstandingInclTax}
              emphasis="total"
              testId="reste-du"
            />

            {found.retention.amount > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                <SummaryLine
                  label="Dont retenue de garantie"
                  cents={found.retention.amount}
                  testId="retenue"
                />
                <SummaryLine
                  label="À régler aujourd’hui"
                  cents={found.dueNowInclTax}
                  emphasis="total"
                  testId="a-regler"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <div>
        <StatusBadge kind="payment" status={found.status} testId="statut-reglement" />
      </div>

      {/*
        Redige POUR LE CLIENT, et non recopie de l'ecran de l'artisan : c'est
        lui qui doit consigner, et il doit lire ce que la loi lui demande.
      */}
      {found.retention.amount > 0 && (
        <Text size="sm" tone="soft">
          Vous pouvez retenir <Money cents={found.retention.amount} /> € au titre de la garantie
          (loi n° 71-584 du 16 juillet 1971). Cette somme est à consigner auprès d’un tiers convenu
          entre vous et l’entreprise —{' '}
          <strong>elle n’est détenue ni par l’entreprise ni par d’équerre</strong>. Elle lui sera
          due{' '}
          {found.retention.releasesOn ? (
            <>
              le <DateText value={found.retention.releasesOn} format="short" />
            </>
          ) : (
            'un an après la réception des travaux, que vous n’avez pas encore déclarée'
          )}
          .
        </Text>
      )}

      <Text size="sm" tone="soft">
        Modalités de paiement : {legal.paymentTerms}
      </Text>

      {/*
        Mentions dues entre professionnels : art. L441-9 et D441-5 du Code de
        commerce. Chaque mention manquante coute 15 EUR, plafonnees a 25 % du
        montant de la facture.
      */}
      {!found.customer.isIndividual && (
        <Card elevation="flat">
          <div className="flex flex-col gap-1">
            <Text size="label" tone="muted">
              Retard de paiement
            </Text>
            <Text size="sm" tone="soft">
              En cas de retard de paiement, des pénalités au taux de {found.latePaymentRate} sont
              exigibles dès le jour suivant la date d’échéance, sans qu’un rappel soit nécessaire,
              ainsi qu’une indemnité forfaitaire pour frais de recouvrement de{' '}
              <Money cents={found.recoveryIndemnity} />.
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
          legal.vatExempt ? 'TVA non applicable, art. 293 B du CGI' : `TVA ${mention(legal.vatNumber, 'numéro de TVA')}`
        }
        phone={mention(legal.phone, 'téléphone')}
        email={mention(legal.email, 'e-mail')}
        insurerName={mention(legal.insurerName, 'nom de l’assureur')}
        insurerAddress={mention(legal.insurerAddress, 'adresse de l’assureur')}
        policyNumber={mention(legal.policyNumber, 'référence du contrat')}
        coveredActivities={mention(legal.coveredActivities, 'activités garanties')}
        coverageArea={mention(legal.coverageArea, 'zone géographique')}
      />
    </PublicShell>
  )
}
