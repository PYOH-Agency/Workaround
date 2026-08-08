'use client'

import { useActionState } from 'react'
import { reviewAnomaly, type ReviewState } from './actions'
import type { Anomaly } from '@/domain/anomaly'

const initialState: ReviewState = {}

const field = 'rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20'

/**
 * L'examen d'un signal.
 *
 * L'empreinte des faits voyage en champ cache : c'est elle qui decide si
 * l'examen masquera encore l'anomalie demain. Sans elle, un dossier vu une fois
 * deviendrait aveugle pour toujours.
 */
export function ReviewForm({ anomaly }: { anomaly: Anomaly }) {
  const [state, action, pending] = useActionState(reviewAnomaly, initialState)

  return (
    <form key={state.saved ?? 0} action={action} className="mt-3 flex flex-wrap items-end gap-3">
      <input type="hidden" name="type" value={anomaly.type} />
      <input type="hidden" name="sujet" value={anomaly.subjectId} />
      <input type="hidden" name="empreinte" value={anomaly.fingerprint} />

      <label className="flex flex-col gap-1 text-sm">
        Verdict
        <select name="verdict" defaultValue="benign" className={field}>
          <option value="benign">Sans suite</option>
          <option value="confirmed">Problème réel</option>
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-1 text-sm">
        Motif
        <input name="motif" required className={field} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/20"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer l’examen'}
      </button>

      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  )
}
