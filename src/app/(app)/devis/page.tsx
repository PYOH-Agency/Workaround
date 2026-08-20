import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company, project, quote } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { ButtonLink } from '@/ui/atoms/button-link'
import { Icon } from '@/ui/atoms/icon'
import { EmptyState } from '@/ui/molecules/empty-state'
import { PageHeader } from '@/ui/molecules/page-header'
import { QuoteTable } from '@/ui/organisms/quote-table'
import { AppShell } from '@/ui/shells/app-shell'

export default async function QuotesPage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/creer-mon-entreprise' : '/connexion')
    }
    throw e
  }

  const [myCompany] = await db
    .select({ legalName: company.legalName })
    .from(company)
    .where(eq(company.id, session.companyId))

  const quotes = await db
    .select({
      id: quote.id,
      number: quote.number,
      totalInclTax: quote.totalInclTax,
      label: project.label,
      // Le statut est desormais affiche dans la liste : sans lui, l'artisan doit
      // ouvrir chaque devis pour savoir lesquels attendent une signature.
      status: quote.status,
    })
    .from(quote)
    .innerJoin(project, eq(quote.projectId, project.id))
    .where(eq(quote.companyId, session.companyId))
    .orderBy(desc(quote.createdAt))

  return (
    <AppShell access={session} companyName={myCompany.legalName}>
      {/*
        Un seul appel a l'action par ecran. Quand la liste est vide, c'est
        l'etat vide qui le porte — deux boutons identiques cote a cote
        diluent l'action et violent le mode strict des selecteurs de test.
      */}
      <PageHeader
        title="Vos devis"
        actions={
          quotes.length > 0 ? (
            <ButtonLink href="/devis/nouveau">
              <Icon name="plus" size="sm" />
              Établir un devis
            </ButtonLink>
          ) : undefined
        }
      />

      <section className="flex flex-col gap-4">
        {quotes.length === 0 ? (
          <EmptyState
            title="Aucun devis pour l’instant"
            description="Rédigez votre premier devis : vos mentions obligatoires sont déjà enregistrées, il ne reste que les prestations à saisir."
            action={
              <ButtonLink href="/devis/nouveau" size="lg">
                <Icon name="plus" size="sm" />
                Établir un devis
              </ButtonLink>
            }
          />
        ) : (
          <QuoteTable quotes={quotes} />
        )}
      </section>
    </AppShell>
  )
}
