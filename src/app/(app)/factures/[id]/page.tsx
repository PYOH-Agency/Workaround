import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice } from '@/db/schema'
import { outstanding, paymentStatus } from '@/domain/payment-status'
import { computeTotals } from '@/domain/quote-totals'
import { can } from '@/domain/authorization'
import { currentCompany, SessionError } from '@/lib/session'
import { TYPE_LABELS } from '@/pdf/invoice-pdf'
import { DateText } from '@/ui/atoms/date-text'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { StatusBadge } from '@/ui/molecules/status-badge'
import { SummaryLine } from '@/ui/molecules/summary-line'
import { QuoteLinesTable } from '@/ui/organisms/quote-lines-table'
import { TotalsPanel } from '@/ui/organisms/totals-panel'
import { AppShell } from '@/ui/shells/app-shell'
import { CreditNoteButton } from './CreditNoteButton'
import { PaymentForm } from './PaymentForm'

const METHOD_LABELS = {
  transfer: 'Virement',
  check: 'Chèque',
  cash: 'Espèces',
  card: 'Carte',
  other: 'Autre',
} as const

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) redirect('/connexion')
    throw e
  }

  // Reserve au responsable : le compagnon ne touche pas a l'argent. La
  // navigation ne le lui propose pas ; celui qui tape l'adresse est renvoye
  // chez lui, sans discours.
  if (!can(session, 'invoice.issue')) redirect('/devis')

  // Restreint a l'entreprise de la session : l'autorisation vit dans le code,
  // ou elle est lisible et testable.
  const found = await db.query.invoice.findFirst({
    where: and(eq(invoice.id, id), eq(invoice.companyId, session.companyId)),
    with: {
      lines: true,
      payments: true,
      quote: true,
      project: { with: { customer: true, property: true } },
    },
  })

  if (!found) notFound()

  const lines = [...found.lines].sort((a, b) => a.position - b.position)
  const { byRate } = computeTotals(found.lines)
  const received = found.payments.map((p) => p.amount)
  const due = outstanding(found.totalInclTax, received)
  const status = paymentStatus(found.totalInclTax, received, found.dueAt, new Date())

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={1}>
            {TYPE_LABELS[found.type]} <span data-testid="numero-facture">{found.number}</span>
          </Heading>
          <Text size="sm" tone="soft">
            Émise le <DateText value={found.issuedAt} format="short" /> · Échéance le{' '}
            <DateText value={found.dueAt} format="short" />
          </Text>
          <Text size="sm" tone="muted">
            {found.project.customer.name}
          </Text>
        </div>
        {/* Le libelle et la couleur viennent de StatusBadge : les deux tables locales ont disparu. */}
        <StatusBadge kind="payment" status={status} testId="statut-reglement" />
      </div>

      <Card elevation="e1">
        <QuoteLinesTable lines={lines} />
        <div className="mt-6 flex flex-col">
          <TotalsPanel
            totals={{
              totalExclTax: found.totalExclTax,
              totalInclTax: found.totalInclTax,
              byRate,
            }}
          />
          <div className="ml-auto w-full max-w-xs">
            <SummaryLine label="Reste dû" cents={due} emphasis="total" testId="reste-du" />
          </div>
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <Heading level={3} as="h2">
          Encaissements
        </Heading>
        {found.payments.length === 0 ? (
          <Text size="sm" tone="muted">
            Aucun encaissement enregistré.
          </Text>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...found.payments]
              .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
              .map((p) => (
                <li key={p.id}>
                  <Card elevation="flat">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <Text size="sm" as="span">
                        <DateText value={p.receivedAt} format="short" />
                      </Text>
                      <Text size="sm" tone="muted" as="span">
                        {METHOD_LABELS[p.method]}
                      </Text>
                      <Text size="sm" tone="muted" as="span">
                        {p.reference}
                      </Text>
                      <span className="ml-auto">
                        <Money cents={p.amount} />
                      </span>
                    </div>
                  </Card>
                </li>
              ))}
          </ul>
        )}

        {due > 0 && <PaymentForm invoiceId={found.id} />}
      </section>

      <Text size="sm" tone="soft">
        Lien du client :{' '}
        <Link href={`/f/${found.publicToken}`} testId="lien-public">
          /f/{found.publicToken}
        </Link>
      </Text>

      {/* Une facture emise ne se modifie jamais : l'avoir est le seul recours. */}
      {found.type !== 'credit_note' && <CreditNoteButton invoiceId={found.id} />}

      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <Link href="/factures" tone="bare">
          Retour aux factures
        </Link>
        {found.quoteId && (
          <Link href={`/devis/${found.quoteId}`} tone="bare">
            Retour au devis
          </Link>
        )}
      </div>
    </AppShell>
  )
}
