'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { activity, companyActivity } from '@/db/schema'
import { currentCompany } from '@/lib/session'
import { uploadCertificate } from '@/services/certificates'
import type { InsuranceKind } from '@/domain/activity'

export interface VerificationState {
  error?: string
  /** Nombre d'operations reussies : sert de cle de remontage aux formulaires. */
  saved?: number
}

/** Declare une activite exercee. Declaratif — la couverture, elle, se prouve. */
export async function declareActivity(
  state: VerificationState,
  form: FormData,
): Promise<VerificationState> {
  const { companyId } = await currentCompany()
  const code = String(form.get('activite') ?? '')

  try {
    const known = await db.query.activity.findFirst({ where: eq(activity.code, code) })
    if (!known) return { error: 'Activité inconnue au référentiel.', saved: state.saved }

    await db.insert(companyActivity).values({ companyId, activityCode: code }).onConflictDoNothing()
  } catch (e) {
    return { error: (e as Error).message, saved: state.saved }
  }

  revalidatePath('/verification')
  return { saved: (state.saved ?? 0) + 1 }
}

export async function removeActivity(code: string): Promise<VerificationState> {
  const { companyId } = await currentCompany()

  try {
    await db
      .delete(companyActivity)
      .where(and(eq(companyActivity.companyId, companyId), eq(companyActivity.activityCode, code)))
  } catch (e) {
    return { error: (e as Error).message }
  }

  revalidatePath('/verification')
  return {}
}

export async function submitCertificate(
  state: VerificationState,
  form: FormData,
): Promise<VerificationState> {
  const { companyId } = await currentCompany()

  try {
    const file = form.get('fichier')
    if (!(file instanceof File)) return { error: 'Aucun fichier reçu.', saved: state.saved }

    await uploadCertificate({
      companyId,
      kind: String(form.get('type') ?? 'decennale') as InsuranceKind,
      file,
    })
  } catch (e) {
    return { error: (e as Error).message, saved: state.saved }
  }

  revalidatePath('/verification')
  return { saved: (state.saved ?? 0) + 1 }
}
