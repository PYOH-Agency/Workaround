'use client'

import { useActionState } from 'react'
import { MAX_STATEMENT_LENGTH } from '@/domain/dispute'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import { writeStatement, type StatementState } from './actions'

const initialState: StatementState = {}

/**
 * La declaration complementaire — article 16.
 *
 * Le texte annonce sa limite : elle sera publiee **a cote** du chiffre, et ne
 * le changera pas. Laisser croire l'inverse ferait de ce champ une promesse de
 * correction qu'il ne tient pas.
 */
export function StatementForm({ quoteId, existing }: { quoteId: string; existing: string }) {
  const [state, action, pending] = useActionState(
    writeStatement.bind(null, quoteId),
    initialState,
  )

  return (
    <Card elevation="e1">
      <form action={action} className="flex flex-col gap-4">
        <Text size="label" tone="muted">
          Déclaration complémentaire
        </Text>

        <Text size="sm" tone="soft">
          Vous pouvez attacher un contexte à ce chantier.{' '}
          <strong>Il sera publié à côté du chiffre, et il ne le changera pas.</strong>
        </Text>

        <Field
          label="Votre commentaire"
          help={`${MAX_STATEMENT_LENGTH} caractères maximum.`}
          error={state.error}
        >
          {(p) => (
            <Textarea
              {...p}
              name="body"
              rows={3}
              maxLength={MAX_STATEMENT_LENGTH}
              defaultValue={existing}
              data-testid="declaration"
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" tone="secondary" pending={pending}>
            {pending ? 'Enregistrement…' : 'Enregistrer la déclaration'}
          </Button>
          {state.saved && (
            <Text size="sm" tone="soft">
              Enregistré.
            </Text>
          )}
        </div>
      </form>
    </Card>
  )
}
