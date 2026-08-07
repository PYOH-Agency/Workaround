'use client'

import { useActionState } from 'react'
import { signUp, type SignUpState } from './actions'

const initialState: SignUpState = {}

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUp, initialState)

  const field = 'rounded-lg border border-black/15 px-3 py-2 dark:border-white/20'

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Votre entreprise</h1>
        <p className="mt-2 text-sm opacity-70">
          Saisissez votre SIRET : on récupère le reste tout seul.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="siret" className="text-sm font-medium">
            SIRET
          </label>
          <input
            id="siret"
            name="siret"
            required
            inputMode="numeric"
            placeholder="123 456 789 00012"
            className={`${field} font-mono`}
          />
          <p className="text-xs opacity-60">14 chiffres, espaces acceptés.</p>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          {pending ? 'Recherche…' : 'Continuer'}
        </button>
      </form>
    </main>
  )
}
