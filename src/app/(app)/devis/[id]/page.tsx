import { notFound, redirect } from 'next/navigation'
import { format } from '@/domain/money'
import { disputeStanding } from '@/domain/dispute'
import { currentCompany, SessionError } from '@/lib/session'
import { quoteDetail } from '@/services/quote-detail'
import { DateText } from '@/ui/atoms/date-text'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'
import { StatusBadge } from '@/ui/molecules/status-badge'
import { QuoteLinesTable } from '@/ui/organisms/quote-lines-table'
import { TotalsPanel } from '@/ui/organisms/totals-panel'
import { AppShell } from '@/ui/shells/app-shell'
import { SendButton } from './SendButton'
import { InvoiceActions } from './InvoiceActions'
import { AmendButton } from './AmendButton'
import { CompleteButton } from './CompleteButton'
import { BookWorkForm } from './BookWorkForm'
import { QuoteVersions } from './QuoteVersions'
import { DisputeButton } from './DisputeButton'
import { StatementForm } from './StatementForm'
import { InvoiceList } from './InvoiceList'
import { Section } from './Section'

/**
 * Ce que l'artisan lit selon l'etat de sa contestation.
 *
 * `settled` couvre deux causes — tort donne, ou silence — et dit la meme chose
 * dans les deux cas : la mesure initiale s'applique. Les distinguer supposerait
 * de publier la reponse du client, qui ne lui a rien promis.
 */
const DISPUTE_MESSAGES: Record<string, (expiresAt: Date) => React.ReactNode> = {
  under_review: (expiresAt) => (
    <>
      Contestation en cours — votre client a jusqu’au <DateText value={expiresAt} format="short" />{' '}
      pour répondre. Ce chantier ne compte pas dans votre taux de délai pendant ce temps.
    </>
  ),
  upheld: () =>
    'Votre client a confirmé : ce retard ne vous est pas imputable. Ce chantier ne compte plus dans votre taux de délai.',
  settled: () => 'La mesure initiale s’applique : ce chantier compte dans votre taux de délai.',
}

/**
 * La fiche d'un devis, en quatre temps.
 *
 * Elle avait fini en pile : pour un devis signe puis termine, sept blocs freres
 * se suivaient sans titre ni hierarchie — le delai engage, le lien du client,
 * la facturation, la fin de chantier, la contestation, la declaration,
 * l'avenant. Chacun avait sa raison d'etre la, aucun ne disait ou il etait.
 *
 * L'ordre suit desormais la vie du devis : ce qu'il dit, sa signature, sa
 * facturation, son chantier, ses versions. Une section absente ne decale pas
 * les autres — leur **place** ne change jamais, seule leur presence varie. Un
 * artisan qui ouvre sa dixieme fiche sait ou regarder sans lire.
 */
export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) redirect('/connexion')
    throw e
  }

  const detail = await quoteDetail(id, session.companyId, new Date())
  if (!detail) notFound()

  const { quote, lines, totals, versions, dispute, statement, invoices } = detail
  const { project, completedAt } = quote

  // La fin de chantier se declare des qu'une version signee fait foi — et non
  // au statut du devis ouvert, qui peut etre un brouillon d'avenant.
  const declarable = detail.reference !== null && completedAt === null

  return (
    <AppShell access={session}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={1}>Devis {quote.number}</Heading>
          <Text size="sm" tone="soft">
            {project.label} · {project.customer.name}
          </Text>
          <Text size="sm" tone="muted">
            {project.property.addressLine1}, {project.property.postalCode} {project.property.city}
          </Text>
        </div>
        <StatusBadge kind="quote" status={quote.status} testId="statut-devis" />
      </div>

      {/* Sans titre : c'est le devis lui-meme, pas une de ses etapes. */}
      <Card elevation="e1">
        <QuoteLinesTable lines={lines} />
        <div className="mt-6">
          <TotalsPanel totals={totals} />
        </div>
        {quote.committedLeadTimeDays !== null && (
          <div className="mt-6">
            <Text size="sm" tone="soft">
              Délai d’exécution engagé : {quote.committedLeadTimeDays} jours ouvrés.
            </Text>
          </div>
        )}
      </Card>

      <Section title="Envoi et signature">
        {quote.status === 'draft' ? (
          <div className="flex flex-wrap items-center gap-4">
            <SendButton quoteId={quote.id} />
            <Link href={`/devis/${quote.id}/modifier`} tone="bare">
              <span className="text-sm">Modifier</span>
            </Link>
          </div>
        ) : (
          <>
            {/* La section porte « signature » : elle doit en dire la date des
                qu'elle existe, sans obliger a deduire du badge de statut. */}
            {quote.signedAt !== null && (
              <Text size="sm" tone="soft">
                Signé par {project.customer.name} le{' '}
                <DateText value={quote.signedAt} format="short" />.
              </Text>
            )}
            <Text size="sm" tone="soft">
              Lien du client :{' '}
              <Link href={`/d/${quote.publicToken}`} testId="lien-public">
                /d/{quote.publicToken}
              </Link>
            </Text>
          </>
        )}
      </Section>

      {(quote.status === 'signed' || invoices.length > 0) && (
        <Section title="Facturation">
          {quote.status === 'signed' && (
            <InvoiceActions quoteId={quote.id} remaining={format(detail.remaining)} />
          )}
          {invoices.length > 0 && <InvoiceList invoices={invoices} />}
        </Section>
      )}

      {(completedAt !== null || declarable) && (
        <Section title="Chantier">
          {/*
            Venu de M6·B, et loge ici plutot qu'entre deux blocs orphelins : le
            fil de chantier est la premiere chose a ouvrir quand on vient voir
            ou en est le chantier. Sa condition est celle d'origine —
            `reference !== null` — et elle est comprise dans celle de la
            section, si bien que le lien s'affiche exactement quand il
            s'affichait avant.
          */}
          {detail.reference !== null && (
            <Text size="sm" tone="soft">
              <Link href={`/devis/${quote.id}/chantier`}>Suivi de chantier</Link> — ce que voit
              votre client.
            </Text>
          )}

          {/*
            On n'intervient pas sur un devis qui n'engage personne : le
            rendez-vous d'intervention suppose une signature.
          */}
          {detail.reference !== null && completedAt === null && (
            <BookWorkForm quoteId={quote.id} />
          )}

          {completedAt !== null ? (
            <Text size="sm" tone="soft">
              Chantier terminé le <DateText value={completedAt} format="short" />
              {quote.completionSource === 'invoiced' ? ' (facture de solde émise)' : ' (déclaré)'}.
            </Text>
          ) : (
            <CompleteButton quoteId={quote.id} today={detail.now.toISOString().slice(0, 10)} />
          )}

          {completedAt !== null && (
            <>
              {detail.disputable && <DisputeButton quoteId={quote.id} />}
              {dispute !== null && (
                <Text size="sm" tone="soft">
                  {DISPUTE_MESSAGES[disputeStanding(dispute, detail.now)](dispute.expiresAt)}
                </Text>
              )}
              <StatementForm quoteId={quote.id} existing={statement?.body ?? ''} />
            </>
          )}
        </Section>
      )}

      {(detail.amendable || versions.length > 1) && (
        <Section title="Versions">
          {detail.amendable && <AmendButton quoteId={quote.id} />}
          {versions.length > 1 && <QuoteVersions versions={versions} currentId={quote.id} />}
        </Section>
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
