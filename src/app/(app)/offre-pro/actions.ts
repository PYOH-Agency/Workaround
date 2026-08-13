'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { company } from '@/db/schema'
import { denial } from '@/domain/authorization'
import { currentCompany, SessionError } from '@/lib/session'
import { requestProActivation } from '@/services/plan'

export interface ProRequestState {
  error?: string
  sent?: boolean
}

/**
 * L'artisan demande l'activation de l'offre Pro depuis l'application.
 *
 * Rien à saisir : la demande porte la raison sociale et le SIRET de
 * l'entreprise connectée, jamais ce qu'un champ aurait recopié.
 */
export async function requestProAction(
  _state: ProRequestState,
  _form: FormData,
): Promise<ProRequestState> {
  let session
  try {
    session = await currentCompany()
  } catch (e) {
    if (e instanceof SessionError) return { error: 'Session expirée. Reconnectez-vous.' }
    throw e
  }

  // Seul le responsable a la main sur le plan ; un compagnon ne demande pas.
  if (denial(session, 'team.manage') === 'role') {
    return { error: 'Seul le responsable de l’entreprise peut demander l’offre Pro.' }
  }

  const [current] = await db
    .select({ legalName: company.legalName, siret: company.siret })
    .from(company)
    .where(eq(company.id, session.companyId))

  if (!current) return { error: 'Entreprise introuvable.' }

  await requestProActivation({
    companyId: session.companyId,
    legalName: current.legalName,
    siret: current.siret,
    by: session.userId,
  })

  revalidatePath('/offre-pro')
  return { sent: true }
}
