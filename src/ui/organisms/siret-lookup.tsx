'use client'

import { useActionState } from 'react'
import { lookupCompany, type LookupState } from '@/app/actions/public'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'

const initialState: LookupState = {}

/**
 * Le champ SIRET, sur les deux pages.
 *
 * `tone` porte la difference : encre cote pro, ou l'action mene a l'outil ;
 * terre cuite cote demandeur, seule page publique sans action destructive
 * alentour (charte §5.4).
 */
export function SiretLookup({
  tone = 'primary',
  label,
  cta,
  hint,
}: {
  tone?: 'primary' | 'conversion'
  label: string
  cta: string
  hint: string
}) {
  const [state, action, pending] = useActionState(lookupCompany, initialState)

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex max-w-md flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Field label={label} error={state.error} required>
            {(p) => (
              <Input
                {...p}
                name="siret"
                inputMode="numeric"
                autoComplete="off"
                placeholder="123 456 789 00012"
              />
            )}
          </Field>
        </div>
        <Button type="submit" tone={tone} size="lg" pending={pending}>
          {cta}
        </Button>
      </div>
      <Text size="sm" tone="muted">
        {hint}
      </Text>
    </form>
  )
}
