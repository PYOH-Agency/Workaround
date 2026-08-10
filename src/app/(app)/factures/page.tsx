import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice } from '@/db/schema'
import { outstanding, paymentStatus } from '@/domain/payment-status'
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
            const status = paymentStatus(row.totalInclTax, received, row.dueAt, now)

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
                          <Money cents={outstanding(row.totalInclTax, received)} /> dus
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
