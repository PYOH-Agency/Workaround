'use client'

import { useActionState } from 'react'
import { submitCertificate, type VerificationState } from './actions'

const initialState: VerificationState = {}

const field = 'rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20'

/**
 * Depot d'une attestation.
 *
 * Le formulaire se vide par remontage apres un succes — la cle change a chaque
 * enregistrement — plutot que par un effet appelant `setState` en cascade.
 */
export function CertificateForm() {
  const [state, action, pending] = useActionState(submitCertificate, initialState)

  return (
    <form
      key={state.saved ?? 0}
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15"
    >
      <label className="flex flex-col gap-1 text-sm">
        Type d’assurance
        <select name="type" defaultValue="decennale" className={field}>
          <option value="decennale">Garantie décennale</option>
          <option value="rc_pro">RC professionnelle</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Attestation (PDF)
        <input name="fichier" type="file" accept="application/pdf" required className={field} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? 'Dépôt…' : 'Déposer'}
      </button>

      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  )
}
