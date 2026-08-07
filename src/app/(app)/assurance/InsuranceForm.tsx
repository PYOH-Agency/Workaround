'use client'

import { useActionState } from 'react'
import { saveInsurance, type InsuranceFormState } from './actions'

const initialState: InsuranceFormState = {}

const field = 'rounded-lg border border-black/15 px-3 py-2 dark:border-white/20'

export function InsuranceForm({
  defaults,
}: {
  defaults: {
    insurerName: string
    insurerAddress: string
    policyNumber: string
    coveredActivities: string
    coverageArea: string
  }
}) {
  const [state, action, pending] = useActionState(saveInsurance, initialState)

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm">
        Nom de l’assureur
        <input name="insurer_name" required defaultValue={defaults.insurerName} className={field} />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Adresse de l’assureur
        <input
          name="insurer_address"
          required
          defaultValue={defaults.insurerAddress}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Référence du contrat
        <input
          name="policy_number"
          required
          defaultValue={defaults.policyNumber}
          className={`${field} font-mono`}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Activités garanties
        <textarea
          name="covered_activities"
          required
          rows={2}
          defaultValue={defaults.coveredActivities}
          className={field}
        />
        <span className="text-xs opacity-60">
          Reprenez la liste exacte de votre attestation. C’est elle qui déterminera plus tard les
          activités que vous pourrez afficher publiquement.
        </span>
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Zone géographique couverte
        <input
          name="coverage_area"
          required
          defaultValue={defaults.coverageArea}
          className={field}
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-foreground px-5 py-2.5 font-medium text-background disabled:opacity-50"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
