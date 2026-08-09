'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db/client'
import { anomalyReview } from '@/db/schema'
import { currentStaff } from '@/lib/staff-session'
import type { AnomalyType } from '@/domain/anomaly'

export interface ReviewState {
  error?: string
  saved?: number
}

/**
 * Enregistre l'examen d'une anomalie.
 *
 * Le motif est obligatoire : un verdict sans raison ne vaut rien six mois plus
 * tard, et c'est la seule trace que l'examen a eu lieu.
 *
 * `confirmed` n'entraine aucune action automatique — le backoffice agit sur les
 * faits, jamais sur les chiffres.
 */
export async function reviewAnomaly(state: ReviewState, form: FormData): Promise<ReviewState> {
  const { userId } = await currentStaff()

  const note = String(form.get('motif') ?? '').trim()
  if (!note) return { error: 'Un motif est obligatoire.', saved: state.saved }

  try {
    await db
      .insert(anomalyReview)
      .values({
        type: String(form.get('type')) as AnomalyType,
        subjectId: String(form.get('sujet')),
        factsFingerprint: String(form.get('empreinte')),
        verdict: form.get('verdict') === 'confirmed' ? 'confirmed' : 'benign',
        note,
        reviewedBy: userId,
      })
      .onConflictDoNothing()
  } catch (e) {
    return { error: (e as Error).message, saved: state.saved }
  }

  revalidatePath('/supervision')
  return { saved: (state.saved ?? 0) + 1 }
}
