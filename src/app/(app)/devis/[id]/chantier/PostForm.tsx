'use client'

import { useActionState } from 'react'
import { MAX_PHOTOS, MAX_POST_LENGTH } from '@/domain/timeline'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Textarea } from '@/ui/atoms/textarea'
import { Card } from '@/ui/molecules/card'
import { Field } from '@/ui/molecules/field'
import { publish, type PostState } from './actions'

const initialState: PostState = {}

/**
 * Publier au fil.
 *
 * Le texte dit ce que le geste engage. **Definitive** n'est pas une precaution
 * de forme : c'est la seule chose qui distingue ce fil d'une messagerie, et
 * l'artisan doit le savoir avant d'ecrire, pas apres.
 */
export function PostForm({ quoteId }: { quoteId: string }) {
  const [state, action, pending] = useActionState(publish.bind(null, quoteId), initialState)

  return (
    <Card elevation="e1">
      <form action={action} className="flex flex-col gap-4">
        <Text size="label" tone="muted">
          Publier pour votre client
        </Text>

        <Text size="sm" tone="soft">
          Votre client reçoit cette publication dans son dossier.{' '}
          <strong>Elle est définitive</strong> : une erreur se corrige par une nouvelle
          publication.
        </Text>

        <Field
          label="Où en est le chantier"
          required
          help={`${MAX_POST_LENGTH} caractères maximum, ${MAX_PHOTOS} photos au plus.`}
          error={state.error}
        >
          {(p) => (
            <Textarea
              {...p}
              name="body"
              rows={3}
              maxLength={MAX_POST_LENGTH}
              data-testid="message-chantier"
            />
          )}
        </Field>

        <Field label="Photos">
          {(p) => (
            <Input
              {...p}
              name="photos"
              type="file"
              multiple
              accept="image/*"
              data-testid="photos-chantier"
            />
          )}
        </Field>

        <div>
          <Button type="submit" tone="secondary" pending={pending}>
            {pending ? 'Publication…' : 'Publier'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
