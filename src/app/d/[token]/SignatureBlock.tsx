'use client'

import { useState, useTransition } from 'react'
import { requestCode, signQuote, type SignState } from './actions'

const field = 'rounded-lg border border-black/15 px-3 py-2 dark:border-white/20'

export function SignatureBlock({ token, phoneHint }: { token: string; phoneHint: string }) {
  const [state, setState] = useState<SignState>({})
  const [pending, startTransition] = useTransition()

  if (state.signed) {
    return (
      <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
        Devis signé. Vous en recevrez une copie.
      </p>
    )
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-black/10 p-6 dark:border-white/15">
      <div>
        <h2 className="font-medium">Signer ce devis</h2>
        <p className="mt-1 text-sm opacity-70">
          Un code vous sera envoyé par SMS au {phoneHint}. Il confirme que c’est bien vous qui
          signez.
        </p>
      </div>

      {!state.codeSent ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setState(await requestCode(token, {})))}
          className="self-start rounded-lg bg-foreground px-5 py-2.5 font-medium text-background disabled:opacity-50"
        >
          {pending ? 'Envoi…' : 'Recevoir le code'}
        </button>
      ) : (
        <form
          action={(form) => startTransition(async () => setState(await signQuote(token, state, form)))}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Votre nom
              <input name="name" required className={field} />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Votre e-mail
              <input name="email" type="email" required className={field} />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm sm:max-w-[12rem]">
            Code reçu par SMS
            <input
              name="code"
              required
              inputMode="numeric"
              maxLength={6}
              className={`${field} font-mono tracking-widest`}
            />
          </label>

          <p className="text-xs opacity-60">
            En signant, vous acceptez ce devis et son délai d’exécution. Un horodatage et la trace
            de votre validation sont conservés comme preuve.
          </p>

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-lg bg-foreground px-5 py-2.5 font-medium text-background disabled:opacity-50"
          >
            {pending ? 'Signature…' : 'Signer le devis'}
          </button>
        </form>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </section>
  )
}
