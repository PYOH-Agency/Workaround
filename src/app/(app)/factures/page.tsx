import Link from 'next/link'
import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { invoice } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { format } from '@/domain/money'
import { outstanding, paymentStatus, type PaymentStatus } from '@/domain/payment-status'
import { TYPE_LABELS } from '@/pdf/invoice-pdf'

const STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'En attente',
  partially_paid: 'Partielle',
  paid: 'Réglée',
  overdue: 'En retard',
}

const STATUS_STYLES: Record<PaymentStatus, string> = {
  unpaid: 'opacity-60',
  partially_paid: 'text-amber-600',
  paid: 'text-emerald-600',
  overdue: 'text-red-600',
}

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

  const rows = await db.query.invoice.findMany({
    where: eq(invoice.companyId, session.companyId),
    with: { payments: true, project: { with: { customer: true } } },
    orderBy: desc(invoice.issuedAt),
  })

  const now = new Date()

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vos factures</h1>
        <Link href="/devis" className="text-sm underline opacity-70">
          Vos devis
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm opacity-70">
          Aucune facture pour l’instant. Une facture s’émet depuis un devis signé.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {rows.map((row) => {
            const received = row.payments.map((p) => p.amount)
            const status = paymentStatus(row.totalInclTax, received, row.dueAt, now)

            return (
              <li key={row.id}>
                <Link
                  href={`/factures/${row.id}`}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 text-sm"
                >
                  <span className="font-mono">{row.number}</span>
                  <span className="opacity-70">{TYPE_LABELS[row.type]}</span>
                  <span className="flex-1 truncate opacity-70">{row.project.customer.name}</span>
                  <span>{format(row.totalInclTax)} €</span>
                  <span className="w-24 text-right opacity-70">
                    {format(outstanding(row.totalInclTax, received))} € dus
                  </span>
                  <span className={`w-20 text-right ${STATUS_STYLES[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
