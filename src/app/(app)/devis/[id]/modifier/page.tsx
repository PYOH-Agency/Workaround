import { notFound, redirect } from 'next/navigation'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote, quoteLine } from '@/db/schema'
import { format } from '@/domain/money'
import { currentCompany, SessionError } from '@/lib/session'
import { AppShell } from '@/ui/shells/app-shell'
import { EditQuoteForm } from './EditQuoteForm'

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) redirect('/connexion')
    throw e
  }

  const found = await db.query.quote.findFirst({
    where: and(eq(quote.id, id), eq(quote.companyId, session.companyId)),
  })

  if (!found) notFound()

  // Un devis envoye ou signe ne se modifie pas : on renvoie a sa fiche plutot
  // que d'afficher un formulaire qui echouerait a l'enregistrement.
  if (found.status !== 'draft') redirect(`/devis/${id}`)

  const lines = await db
    .select()
    .from(quoteLine)
    .where(eq(quoteLine.quoteId, id))
    .orderBy(asc(quoteLine.position))

  return (
    <AppShell access={session}>
      <EditQuoteForm
        quoteId={found.id}
        number={found.number}
        committedLeadTimeDays={found.committedLeadTimeDays}
        retentionRate={found.retentionRate}
        initialLines={lines.map((line) => ({
          label: line.label,
          unit: line.unit,
          quantity: line.quantity,
          price: format(line.unitPriceExclTax).replace(/\s/g, '').replace(',', '.'),
          taxRate: line.taxRate,
        }))}
      />
    </AppShell>
  )
}
