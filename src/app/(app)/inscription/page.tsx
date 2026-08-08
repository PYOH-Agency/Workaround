'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Heading } from '@/ui/atoms/heading'
import { Input } from '@/ui/atoms/input'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { PublicShell } from '@/ui/shells/public-shell'
import { signUp, type SignUpState } from './actions'

const initialState: SignUpState = {}

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUp, initialState)

  return (
    <PublicShell variant="plain">
      <div className="flex flex-col gap-2">
        <Heading level={1}>Votre entreprise</Heading>
        <Text size="sm" tone="soft">
          Saisissez votre SIRET : on récupère le reste tout seul.
        </Text>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <Field label="SIRET" help="14 chiffres, espaces acceptés." required>
          {(p) => (
            <Input {...p} name="siret" inputMode="numeric" placeholder="123 456 789 00012" />
          )}
        </Field>

        <Text size="sm" tone="muted">
          En continuant, vous acceptez notre{' '}
          <Link href="/confidentialite" newTab>
            politique de protection des données
          </Link>
          .
        </Text>

        {state.error && (
          <div
            role="alert"
            className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
          >
            {state.error}
          </div>
        )}

        <Button type="submit" size="lg" pending={pending}>
          {pending ? 'Recherche…' : 'Continuer'}
        </Button>
      </form>
    </PublicShell>
  )
}
