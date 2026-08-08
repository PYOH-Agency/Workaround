import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import { computeTotals } from '@/domain/quote-totals'
import { currentCompany, SessionError } from '@/lib/session'
import { Heading } from '@/ui/atoms/heading'
import { IconBack } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { StatusBadge } from '@/ui/molecules/status-badge'
import { QuoteLinesTable } from '@/ui/organisms/quote-lines-table'
import { TotalsPanel } from '@/ui/organisms/totals-panel'
import { AppShell } from '@/ui/shells/app-shell'
import { SendButton } from './SendButton'

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
        <SendButton quoteId={found.id} />
      ) : (
        <Text size="sm" tone="soft">
          Lien du client :{' '}
          <span data-testid="lien-public">
            <Link href={`/d/${found.publicToken}`}>/d/{found.publicToken}</Link>
          </span>
        </Text>
      )}

      <div className="mt-2">
        <Link href="/devis" tone="bare">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <IconBack size="sm" />
            Retour aux devis
          </span>
        </Link>
      </div>
    </AppShell>
  )
}
