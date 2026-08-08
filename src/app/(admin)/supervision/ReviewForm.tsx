'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Field } from '@/ui/molecules/field'
import { reviewAnomaly, type ReviewState } from './actions'
import type { Anomaly } from '@/domain/anomaly'

const initialState: ReviewState = {}

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
    <form key={state.saved ?? 0} action={action} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="type" value={anomaly.type} />
      <input type="hidden" name="sujet" value={anomaly.subjectId} />
      <input type="hidden" name="empreinte" value={anomaly.fingerprint} />

      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <Field label="Verdict" required>
          {(p) => (
            <Select {...p} name="verdict" defaultValue="benign">
              <option value="benign">Sans suite</option>
              <option value="confirmed">Problème réel</option>
            </Select>
          )}
        </Field>

        <Field label="Motif" help="Sans raison écrite, l’examen ne vaudra rien dans six mois." required>
          {(p) => <Input {...p} name="motif" />}
        </Field>
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}

      <div className="self-start">
        <Button type="submit" tone="secondary" pending={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer l’examen'}
        </Button>
      </div>
    </form>
  )
}
