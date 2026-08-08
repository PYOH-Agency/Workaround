'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote } from '@/db/schema'
import { assertSendable } from '@/services/quote-public'
import { hasLegalMentions } from '@/domain/legal-mentions'
import { sendQuoteLink } from '@/services/email'
import { recordEvent } from '@/services/events'
import { passportLink, trackedPassport } from '@/services/passport'
import { currentCompany } from '@/lib/session'
import { format } from '@/domain/money'

export interface SendState {
  error?: string
  link?: string
}

export async function sendQuote(quoteId: string, _state: SendState): Promise<SendState> {
  const { companyId } = await currentCompany()

  const found = await db.query.quote.findFirst({
    where: and(eq(quote.id, quoteId), eq(quote.companyId, companyId)),
    with: { lines: true, project: { with: { customer: true, company: true } } },
  })

  if (!found) return { error: 'Devis introuvable.' }

  try {
    assertSendable({
      status: found.status,
      committedLeadTimeDays: found.committedLeadTimeDays,
      lineCount: found.lines.length,
      customerPhone: found.project.customer.phone,
      hasInsuranceMentions: hasLegalMentions(found.project.company),
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Lien public volontairement court : il part par e-mail, et souvent par SMS
  // derriere. `/devis/[id]` etant deja pris cote entreprise, Next.js refuserait
  // un `/devis/[token]` — deux slugs differents au meme niveau.
  const link = `${process.env.APP_URL}/d/${found.publicToken}`

  // Le passeport n'accompagne le devis que si l'entreprise en a un. Une panne
  // de ce calcul ne doit surtout pas empecher l'envoi : le devis est
  // l'obligation, le passeport est le supplement.
  const passportUrl = await safePassportUrl(found.project.company)

  try {
    await sendQuoteLink({
      to: found.project.customer.email,
      customerName: found.project.customer.name,
      companyName: found.project.company.legalName,
      quoteNumber: found.number,
      totalInclTax: format(found.totalInclTax),
      link,
      passportUrl,
    })
  } catch {
    // L'envoi echoue : on ne marque surtout pas le devis comme envoye, sinon
    // l'artisan croirait son client prevenu et la metrique serait fausse.
    return { error: "L'envoi de l'e-mail a échoué. Réessayez dans un instant." }
  }

  await db
    .update(quote)
    .set({ status: 'sent', sentAt: new Date() })
    .where(eq(quote.id, quoteId))

  await recordEvent({
    type: 'quote.sent',
    subjectType: 'quote',
    subjectId: quoteId,
    companyId,
    actorType: 'company',
    payload: { number: found.number, committedLeadTimeDays: found.committedLeadTimeDays },
  })

  revalidatePath(`/devis/${quoteId}`)
  return { link }
}

/** Le passeport ne doit jamais faire echouer un envoi de devis. */
async function safePassportUrl(company: {
  id: string
  legalName: string
  siret: string
}): Promise<string | null> {
  try {
    const passport = await passportLink(company, new Date())
    return passport && trackedPassport(passport.url, 'courriel')
  } catch {
    return null
  }
}
