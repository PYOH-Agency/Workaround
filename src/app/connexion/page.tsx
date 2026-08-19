'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/ui/atoms/button'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { PublicShell } from '@/ui/shells/public-shell'

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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    /*
      Le client se construit ICI, et pas dans le corps du composant.

      Ce n'est pas une optimisation. `createBrowserClient` leve des que l'URL
      ou la cle manque, et un composant client est **execute au prerendu** :
      cette page etant statique, le build entier tombait sur « Your project's
      URL and API key are required », sans dire que c'etait la configuration
      qui manquait. On cherche alors un defaut de code la ou il n'y en a pas —
      exactement ce que `scripts/check-environment.mjs` decrit, et qui s'est
      produit au premier deploiement.

      Construit a la soumission, le client n'existe que dans un navigateur, au
      moment ou l'on s'en sert. Le build ne depend plus d'un secret, et une
      variable absente se manifeste la ou elle manque vraiment : a l'envoi.
      Accessoirement, il cessait aussi d'etre reconstruit a chaque rendu.
    */
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm` },
    })

    if (sendError) setError("L'envoi a échoué. Réessayez dans un instant.")
    else setSent(true)
  }

  return (
    <PublicShell variant="plain">
      <div className="flex flex-col gap-2">
        <Heading level={1}>Se connecter</Heading>
        <Text size="sm" tone="soft">
          Pas de mot de passe : on vous envoie un lien.
        </Text>
      </div>

      {sent ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-card border border-verified bg-verified-bg px-5 py-4 text-verified"
        >
          <Icon name="check" />
          <Text as="span">
            Lien envoyé à <strong>{email}</strong>. Ouvrez-le depuis votre téléphone.
          </Text>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <Field label="E-mail" required>
            {(p) => (
              <Input
                {...p}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>

          {error && (
            <div
              role="alert"
              className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
            >
              {error}
            </div>
          )}

          <Button type="submit" size="lg">
            Recevoir le lien
          </Button>
        </form>
      )}
    </PublicShell>
  )
}
