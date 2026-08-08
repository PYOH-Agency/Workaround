'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Field } from '@/ui/molecules/field'
import { submitCertificate, type VerificationState } from './actions'

const initialState: VerificationState = {}

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
      className="flex flex-col gap-4 rounded-card border border-rule bg-card p-5"
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-56">
          <Field label="Type d’assurance">
            {(p) => (
              <Select {...p} name="type" defaultValue="decennale">
                <option value="decennale">Garantie décennale</option>
                <option value="rc_pro">RC professionnelle</option>
              </Select>
            )}
          </Field>
        </div>

        <div className="min-w-64 flex-1">
          <Field label="Attestation (PDF)" required>
            {(p) => <Input {...p} name="fichier" type="file" accept="application/pdf" />}
          </Field>
        </div>

        <Button type="submit" pending={pending}>
          {pending ? 'Dépôt…' : 'Déposer'}
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
