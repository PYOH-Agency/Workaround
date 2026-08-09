import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, quote } from '@/db/schema'
import { computeTotals } from '@/domain/quote-totals'
import { format } from '@/domain/money'
import { remainingToInvoice } from '@/domain/invoice-balance'
import { currentCompany, SessionError } from '@/lib/session'
import { issuedAgainstQuote } from '@/services/invoices'
import { TYPE_LABELS } from '@/pdf/invoice-pdf'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { StatusBadge } from '@/ui/molecules/status-badge'
import { QuoteLinesTable } from '@/ui/organisms/quote-lines-table'
import { TotalsPanel } from '@/ui/organisms/totals-panel'
import { AppShell } from '@/ui/shells/app-shell'
import { engagedTotal, referenceVersion } from '@/domain/quote-versions'
import { assertDisputable, disputeStanding } from '@/domain/dispute'
import { businessDaysSince } from '@/domain/business-days'
import { quoteVersions } from '@/services/amendments'
import { disputeFor } from '@/services/disputes'
import { statementFor } from '@/services/statements'
import { SendButton } from './SendButton'
import { InvoiceActions } from './InvoiceActions'
import { AmendButton } from './AmendButton'
import { CompleteButton } from './CompleteButton'
import { QuoteVersions } from './QuoteVersions'
import { DisputeButton } from './DisputeButton'
import { StatementForm } from './StatementForm'

/**
 * Ce que l'artisan lit selon l'etat de sa contestation.
 *
 * `settled` couvre deux causes — tort donne, ou silence — et dit la meme chose
 * dans les deux cas : la mesure initiale s'applique. Les distinguer supposerait
 * de publier la reponse du client, qui ne lui a rien promis.
 */
const DISPUTE_MESSAGES: Record<string, (expiresAt: Date) => string> = {
  under_review: (expiresAt) =>
    `Contestation en cours — votre client a jusqu’au ${expiresAt.toLocaleDateString('fr-FR')} pour répondre. Ce chantier ne compte pas dans votre taux de délai pendant ce temps.`,
  upheld: () =>
    'Votre client a confirmé : ce retard ne vous est pas imputable. Ce chantier ne compte plus dans votre taux de délai.',
  settled: () => 'La mesure initiale s’applique : ce chantier compte dans votre taux de délai.',
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) redirect('/connexion')
    throw e
  }

  // Restreint a l'entreprise de la session : l'autorisation vit dans le code,
  // ou elle est lisible et testable.
  const found = await db.query.quote.findFirst({
    where: and(eq(quote.id, id), eq(quote.companyId, session.companyId)),
    with: { lines: true, project: { with: { customer: true, property: true } } },
  })

  if (!found) notFound()

  const totals = computeTotals(found.lines)
  const lines = [...found.lines].sort((a, b) => a.position - b.position)

  const versions = await quoteVersions(found.id)
  const reference = referenceVersion(versions)
  const amendable = versions.length > 0 && reference !== null && !versions.some((v) => v.status === 'draft' || v.status === 'sent')

  const now = new Date()
  const dispute = await disputeFor(found.id)
  const statement = await statementFor(found.id)

  // La MEME fonction que le service : l'ecran ne peut pas proposer ce que le
  // service refusera, ni le cacher quand il l'accepterait.
  let disputable = true
  try {
    assertDisputable({
      completedAt: found.completedAt,
      committedLeadTimeDays: found.committedLeadTimeDays,
      businessDaysUsed:
        found.signedAt && found.completedAt
          ? businessDaysSince(found.signedAt, found.completedAt)
          : 0,
      existing: dispute,
      reason: 'placeholder',
    })
  } catch {
    disputable = false
  }

  const issued = await issuedAgainstQuote(found.id)
  const invoices = await db
    .select({
      id: invoice.id,
      number: invoice.number,
      type: invoice.type,
      totalInclTax: invoice.totalInclTax,
    })
    .from(invoice)
    .where(eq(invoice.quoteId, found.id))
    .orderBy(invoice.number)

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={1}>Devis {found.number}</Heading>
          <Text size="sm" tone="soft">
            {found.project.label} · {found.project.customer.name}
          </Text>
          <Text size="sm" tone="muted">
            {found.project.property.addressLine1}, {found.project.property.postalCode}{' '}
            {found.project.property.city}
          </Text>
        </div>
        {/*
          La correspondance statut -> couleur vit desormais dans StatusBadge :
          le STATUS_LABELS local qui la dupliquait a disparu.
        */}
        <StatusBadge kind="quote" status={found.status} testId="statut-devis" />
      </div>

      <Card elevation="e1">
        <QuoteLinesTable lines={lines} />
        <div className="mt-6">
          <TotalsPanel totals={totals} />
        </div>
      </Card>

      {found.committedLeadTimeDays !== null && (
        <Text size="sm" tone="soft">
          Délai d’exécution engagé : {found.committedLeadTimeDays} jours ouvrés.
        </Text>
      )}

      {found.status === 'draft' ? (
        <div className="flex flex-wrap items-center gap-4">
          <SendButton quoteId={found.id} />
          <Link href={`/devis/${found.id}/modifier`} tone="bare">
            <span className="text-sm">Modifier</span>
          </Link>
        </div>
      ) : (
        <Text size="sm" tone="soft">
          Lien du client :{' '}
          <Link href={`/d/${found.publicToken}`} testId="lien-public">
            /d/{found.publicToken}
          </Link>
        </Text>
      )}

      {found.status === 'signed' && (
        <InvoiceActions
          quoteId={found.id}
          remaining={format(remainingToInvoice(engagedTotal(versions), issued))}
        />
      )}

      {reference !== null && found.completedAt === null && (
        <CompleteButton quoteId={found.id} today={new Date().toISOString().slice(0, 10)} />
      )}

      {reference !== null && (
        <Text size="sm" tone="soft">
          <Link href={`/devis/${found.id}/chantier`}>Suivi de chantier</Link> — ce que voit votre
          client.
        </Text>
      )}

      {found.completedAt !== null && (
        <Text size="sm" tone="soft">
          Chantier terminé le {found.completedAt.toLocaleDateString('fr-FR')}
          {found.completionSource === 'invoiced' ? ' (facture de solde émise)' : ' (déclaré)'}.
        </Text>
      )}

      {found.completedAt !== null && (
        <>
          {disputable && <DisputeButton quoteId={found.id} />}
          {dispute !== null && (
            <Text size="sm" tone="soft">
              {DISPUTE_MESSAGES[disputeStanding(dispute, now)](dispute.expiresAt)}
            </Text>
          )}
          <StatementForm quoteId={found.id} existing={statement?.body ?? ''} />
        </>
      )}

      {amendable && <AmendButton quoteId={found.id} />}

      {versions.length > 1 && (
        <section className="flex flex-col gap-3">
          <Heading level={3} as="h2">
            Versions de ce devis
          </Heading>
          <QuoteVersions versions={versions} currentId={found.id} />
        </section>
      )}

      {invoices.length > 0 && (
        <section className="flex flex-col gap-3">
          <Heading level={3} as="h2">
            Factures émises
          </Heading>
          <ul className="flex flex-col gap-3">
            {invoices.map((row) => (
              <li key={row.id}>
                <Link href={`/factures/${row.id}`} tone="bare">
                  <Card elevation="e1">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <Text size="sm" tone="muted" as="span">
                        {row.number}
                      </Text>
                      <Text as="span">{TYPE_LABELS[row.type]}</Text>
                      <span className="ml-auto">
                        <Money cents={row.totalInclTax} emphasis="strong" />
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-2">
        <Link href="/devis" tone="bare">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Icon name="back" size="sm" />
            Retour aux devis
          </span>
        </Link>
      </div>
    </AppShell>
  )
}
