import { redirect } from 'next/navigation'
import { desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice, quote } from '@/db/schema'
import { amountDueNow, paymentStatus } from '@/domain/payment-status'
import { retentionState } from '@/domain/retention'
import { can } from '@/domain/authorization'
import { currentCompany, SessionError } from '@/lib/session'
import { TYPE_LABELS } from '@/pdf/invoice-pdf'
import { Heading } from '@/ui/atoms/heading'
import { Link } from '@/ui/atoms/link'
import { Money } from '@/ui/atoms/money'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { EmptyState } from '@/ui/molecules/empty-state'
import { StatusBadge } from '@/ui/molecules/status-badge'
import { AppShell } from '@/ui/shells/app-shell'

export default async function InvoicesPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  // Reserve au responsable : le compagnon ne touche pas a l'argent. La
  // navigation ne le lui propose pas ; celui qui tape l'adresse est renvoye
  // chez lui, sans discours.
  if (!can(session, 'invoice.issue')) redirect('/devis')

  const rows = await db.query.invoice.findMany({
    where: eq(invoice.companyId, session.companyId),
    with: { payments: true, project: { with: { customer: true } } },
    orderBy: desc(invoice.issuedAt),
  })

  const now = new Date()

  // Les receptions des devis concernes, en UNE requete. Appeler `retentionOf`
  // par ligne en ferait N ; `retentionState` est pure, l'appeler en boucle
  // ensuite ne coute rien.
  const quoteIds = [...new Set(rows.map((row) => row.quoteId).filter((id) => id !== null))]
  const receptions = quoteIds.length
    ? await db
        .select({ id: quote.id, receivedAt: quote.receivedAt })
        .from(quote)
        .where(inArray(quote.id, quoteIds))
    : []

  const receivedAtOf = new Map(receptions.map((row) => [row.id, row.receivedAt]))

  return (
    <AppShell access={session}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={1}>Vos factures</Heading>
        <Link href="/devis" tone="bare">
          <span className="text-sm">Vos devis</span>
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune facture pour l’instant"
          description="Une facture s’émet depuis un devis signé : acompte, situation ou solde."
          action={
            <Link href="/devis">
              <span className="text-sm">Voir vos devis</span>
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const received = row.payments.map((p) => p.amount)
            const { withheld } = retentionState(
              {
                totalInclTax: row.totalInclTax,
                rate: row.retentionRate,
                receivedAt: row.quoteId ? (receivedAtOf.get(row.quoteId) ?? null) : null,
              },
              now,
            )
            const settlement = {
              totalInclTax: row.totalInclTax,
              payments: received,
              dueAt: row.dueAt,
              withheld,
            }
            const status = paymentStatus(settlement, now)

            return (
              <li key={row.id}>
                <Link href={`/factures/${row.id}`} tone="bare">
                  <Card elevation="e1">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <Text size="sm" tone="muted" as="span">
                          {row.number} · {TYPE_LABELS[row.type]}
                        </Text>
                        <Text as="span">{row.project.customer.name}</Text>
                      </div>
                      <StatusBadge kind="payment" status={status} />
                      <div className="flex flex-col items-end gap-0.5">
                        <Money cents={row.totalInclTax} emphasis="strong" />
                        <Text size="sm" tone="muted" as="span">
                          <Money cents={amountDueNow(settlement)} /> dus
                        </Text>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </AppShell>
  )
}
