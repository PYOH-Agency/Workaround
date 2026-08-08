'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Heading } from '@/ui/atoms/heading'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Field } from '@/ui/molecules/field'
import { reject, validate, type ReviewState } from '../actions'

const initialState: ReviewState = {}

export interface ActivityOption {
  code: string
  label: string
}

function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="w-full rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
    >
      {message}
    </div>
  )
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
      <form action={action} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Assureur" required>
            {(p) => <Input {...p} name="assureur" />}
          </Field>
          <Field label="Numéro de police" required>
            {(p) => <Input {...p} name="police" />}
          </Field>
          <Field label="Valide du" required>
            {(p) => <Input {...p} name="debut" type="date" />}
          </Field>
          <Field label="Valide jusqu’au" required>
            {(p) => <Input {...p} name="fin" type="date" />}
          </Field>
        </div>

        <div className="flex flex-col gap-4">
          <Heading level={3} as="h2">
            Correspondances
          </Heading>

          {rows.map((row) => (
            <div key={row} className="grid gap-4 sm:grid-cols-2">
              <Field label="Libellé lu sur l’attestation">
                {(p) => <Input {...p} name="libelle" />}
              </Field>
              <Field label="Activité du référentiel">
                {(p) => (
                  <Select {...p} name="activite" defaultValue="">
                    <option value="">Aucune</option>
                    {options.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} — {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          ))}

          <div className="self-start">
            <Button
              tone="ghost"
              onClick={() => setRows((current) => [...current, current.length])}
            >
              Ajouter une correspondance
            </Button>
          </div>
        </div>

        {state.error && <FormError message={state.error} />}

        <div className="self-start">
          <Button type="submit" size="lg" pending={pending}>
            {pending ? 'Validation…' : 'Valider l’attestation'}
          </Button>
        </div>
      </form>

      <RejectForm certificateId={certificateId} />
    </div>
  )
}

/** Le refus exige un motif : il est communique a l'artisan. */
function RejectForm({ certificateId }: { certificateId: string }) {
  const [state, action, pending] = useActionState(reject.bind(null, certificateId), initialState)

  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-3 border-t border-rule pt-6"
    >
      <div className="min-w-64 flex-1">
        <Field label="Motif de refus" required>
          {(p) => <Input {...p} name="motif" />}
        </Field>
      </div>

      <Button type="submit" tone="danger" pending={pending}>
        Refuser
      </Button>

      {state.error && <FormError message={state.error} />}
    </form>
  )
}
