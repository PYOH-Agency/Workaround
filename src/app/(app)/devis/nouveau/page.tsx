import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { hasLegalMentions } from '@/domain/legal-mentions'
import { AppShell } from '@/ui/shells/app-shell'
import { NewQuoteForm } from './NewQuoteForm'

export default async function NewQuotePage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/creer-mon-entreprise' : '/connexion')
    }
    throw e
  }

  const [current] = await db.select().from(company).where(eq(company.id, session.companyId))

  // Un devis auquel il manque une mention obligatoire expose l'artisan a une
  // amende. On ne le laisse donc pas en rediger un avant de les avoir toutes.
  if (!hasLegalMentions(current)) redirect('/mentions')

  return (
    <AppShell access={session} companyName={current.legalName}>
      <NewQuoteForm validityDays={current.quoteValidityDays ?? 90} />
    </AppShell>
  )
}
