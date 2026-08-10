import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quoteLine } from '@/db/schema'
import { can } from '@/domain/authorization'
import { multiply } from '@/domain/money'
import { currentCompany, SessionError } from '@/lib/session'
import { quoteDetail } from '@/services/quote-detail'
import { issuedAgainstQuote } from '@/services/invoices'
import { previousProgress } from '@/services/situations'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { AppShell } from '@/ui/shells/app-shell'
import { SituationForm } from './SituationForm'

/**
 * La saisie d'une situation de travaux.
 *
 * Les lignes sont celles de la version qui FAIT FOI — le dernier avenant signe
 * —, jamais celles du devis ouvert : un brouillon d'avenant n'engage personne
 * et ne se facture pas.
 */
export default async function SituationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) redirect('/connexion')
    throw e
  }

  // Meme discipline qu'ailleurs : la navigation ne le propose pas, celui qui
  // tape l'adresse est renvoye chez lui. `/equipe` reste le seul ecran qui
  // explique la porte Pro.
  if (!can(session, 'situation.issue')) redirect(`/devis/${id}`)

  const detail = await quoteDetail(id, session.companyId, new Date())
  if (!detail) notFound()
  if (!detail.reference) redirect(`/devis/${id}`)

  const [lines, previous, issued] = await Promise.all([
    db.select().from(quoteLine).where(eq(quoteLine.quoteId, detail.reference.id)),
    previousProgress(detail.quote.id),
    issuedAgainstQuote(detail.quote.id),
  ])

  const rows = [...lines]
    .sort((a, b) => a.position - b.position)
    .map((line) => ({
      id: line.id,
      label: line.label,
      taxRate: line.taxRate,
      totalExclTax: multiply(line.unitPriceExclTax, line.quantity),
      previousPercent: previous[line.id] ?? 0,
    }))

  return (
    <AppShell access={session}>
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Heading level={1}>Situation de travaux</Heading>
          <Text size="sm" tone="soft">
            Devis {detail.quote.number} · {detail.quote.project.customer.name}
          </Text>
        </div>

        <SituationForm quoteId={detail.quote.id} rows={rows} issued={issued} />

        <div className="mt-2">
          <Link href={`/devis/${id}`} tone="bare">
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Icon name="back" />
              Retour au devis
            </span>
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
