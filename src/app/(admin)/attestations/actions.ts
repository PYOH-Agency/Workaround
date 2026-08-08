'use server'

import { redirect } from 'next/navigation'
import { currentStaff } from '@/lib/staff-session'
import { rejectCertificate, validateCertificate } from '@/services/certificate-review'

export interface ReviewState {
  error?: string
}

/**
 * Etablit les correspondances et valide.
 *
 * Le formulaire porte une ligne par correspondance : le libelle lu sur
 * l'attestation, et l'activite du referentiel a laquelle le relecteur estime
 * qu'il correspond. C'est cet appariement qui engage — pas la lecture.
 */
export async function validate(
  certificateId: string,
  _state: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  const { userId } = await currentStaff()

  try {
    const codes = form.getAll('activite').map(String)
    const labels = form.getAll('libelle').map(String)

    const matches = codes
      .map((activityCode, i) => ({ activityCode, sourceLabel: labels[i] ?? '' }))
      .filter((match) => match.activityCode.trim() !== '')

    for (const match of matches) {
      if (!match.sourceLabel.trim()) {
        return { error: 'Reportez le libellé exact lu sur l’attestation pour chaque activité.' }
      }
    }

    await validateCertificate({
      certificateId,
      reviewerId: userId,
      insurerName: String(form.get('assureur') ?? ''),
      policyNumber: String(form.get('police') ?? ''),
      validFrom: new Date(String(form.get('debut'))),
      validUntil: new Date(String(form.get('fin'))),
      matches,
    })
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Hors du bloc try : `redirect` signale la navigation en levant une
  // exception, qu'un catch afficherait comme une erreur.
  redirect('/attestations?valide=1')
}

export async function reject(
  certificateId: string,
  _state: ReviewState,
  form: FormData,
): Promise<ReviewState> {
  const { userId } = await currentStaff()

  try {
    await rejectCertificate(certificateId, userId, String(form.get('motif') ?? ''))
  } catch (e) {
    return { error: (e as Error).message }
  }

  redirect('/attestations?refus=1')
}
