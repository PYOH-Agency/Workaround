import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { currentCompany, SessionError } from '@/lib/session'
import { hasLegalInsuranceMentions } from '@/domain/insurance'
import { NewQuoteForm } from './NewQuoteForm'

export default async function NewQuotePage() {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) {
      redirect(e.message.includes('Aucune entreprise') ? '/inscription' : '/connexion')
    }
    throw e
  }

  const [current] = await db.select().from(company).where(eq(company.id, session.companyId))

  // Un devis sans les mentions d'assurance expose l'artisan a une amende
  // (art. L243-2). On ne le laisse donc pas en rediger un avant de les avoir.
  if (!hasLegalInsuranceMentions(current)) redirect('/assurance')

  return <NewQuoteForm />
}
