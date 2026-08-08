'use client'

import { useActionState, useState } from 'react'
import { reject, validate, type ReviewState } from '../actions'

const initialState: ReviewState = {}

const field = 'rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20'

export interface ActivityOption {
  code: string
  label: string
}

/**
 * L'ecran de revue.
 *
 * Une ligne par correspondance : le libelle exact lu sur l'attestation, et
 * l'activite du referentiel a laquelle il correspond. Le libelle source est
 * conserve tel quel — c'est lui qui permet de rejuger la decision plus tard.
 */
export function ReviewForm({
  certificateId,
  options,
}: {
  certificateId: string
  options: ActivityOption[]
}) {
  const [state, action, pending] = useActionState(validate.bind(null, certificateId), initialState)
  const [rows, setRows] = useState([0])

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Assureur
            <input name="assureur" required className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Numéro de police
            <input name="police" required className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Valide du
            <input name="debut" type="date" required className={field} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Valide jusqu’au
            <input name="fin" type="date" required className={field} />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Correspondances</h2>
          {rows.map((row) => (
            <div key={row} className="flex flex-wrap gap-3">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Libellé lu sur l’attestation
                <input name="libelle" className={field} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Activité du référentiel
                <select name="activite" defaultValue="" className={field}>
                  <option value="">Aucune</option>
                  {options.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.code} — {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setRows((current) => [...current, current.length])}
            className="self-start text-sm underline opacity-70"
          >
            Ajouter une correspondance
          </button>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? 'Validation…' : 'Valider l’attestation'}
        </button>
      </form>

      <RejectForm certificateId={certificateId} />
    </div>
  )
}

/** Le refus exige un motif : il est communique a l'artisan. */
function RejectForm({ certificateId }: { certificateId: string }) {
  const [state, action, pending] = useActionState(reject.bind(null, certificateId), initialState)

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 border-t border-black/10 pt-6 dark:border-white/15">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Motif de refus
        <input name="motif" required className={field} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/20"
      >
        Refuser
      </button>

      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  )
}
