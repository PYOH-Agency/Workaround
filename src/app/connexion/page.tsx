'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

/**
 * Connexion par lien magique, sans mot de passe.
 *
 * L'artisan est sur un chantier, avec des gants et une 4G mediocre : lui
 * demander de retenir un mot de passe est le meilleur moyen qu'il n'ouvre
 * jamais l'outil.
 */
export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm` },
    })

    if (sendError) setError("L'envoi a échoué. Réessayez dans un instant.")
    else setSent(true)
  }

  const field = 'rounded-lg border border-black/15 px-3 py-2 dark:border-white/20'

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Se connecter</h1>
        <p className="mt-2 text-sm opacity-70">Pas de mot de passe : on vous envoie un lien.</p>
      </div>

      {sent ? (
        <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
          Lien envoyé à <strong>{email}</strong>. Ouvrez-le depuis votre téléphone.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="rounded-lg bg-foreground px-4 py-2 font-medium text-background"
          >
            Recevoir le lien
          </button>
        </form>
      )}
    </main>
  )
}
