'use client'

import { useActionState } from 'react'
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
    <form key={state.saved ?? 0} action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Ajouter une activité
        <select
          name="activite"
          required
          defaultValue=""
          className="rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20"
        >
          <option value="" disabled>
            Choisir dans le référentiel…
          </option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} — {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/20"
      >
        Déclarer
      </button>

      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  )
}
