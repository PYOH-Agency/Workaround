'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Select } from '@/ui/atoms/select'
import { Field } from '@/ui/molecules/field'
import { declareActivity, type VerificationState } from './actions'

const initialState: VerificationState = {}

export interface ActivityOption {
  code: string
  label: string
  family: string
}

/** Declaration d'une activite exercee, choisie dans le referentiel. */
export function ActivityForm({ options }: { options: ActivityOption[] }) {
  const [state, action, pending] = useActionState(declareActivity, initialState)

  return (
    <form key={state.saved ?? 0} action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Field label="Ajouter une activité" required>
            {(p) => (
              <Select {...p} name="activite" defaultValue="">
                <option value="" disabled>
                  Choisir dans le référentiel…
                </option>
                {options.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} — {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Button type="submit" tone="secondary" pending={pending}>
          Déclarer
        </Button>
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}
    </form>
  )
}
