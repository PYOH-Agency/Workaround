'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/ui/atoms/button'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Input } from '@/ui/atoms/input'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { PublicShell } from '@/ui/shells/public-shell'

/**
 * Connexion par lien magique, sans mot de passe.
 *
 * L'artisan est sur un chantier, avec des gants et une 4G mediocre : lui
 * demander de retenir un mot de passe est le meilleur moyen qu'il n'ouvre
 * jamais l'outil. Ce choix ne tient que parce que la SESSION NE MEURT PAS —
 * voir `supabase/config.toml`, section `[auth.sessions]`.
 *
 * **Porte de RETOUR seule.** `shouldCreateUser: false` : la creation de compte
 * n'a lieu que derriere `/creer-mon-entreprise` et `/creer-mon-compte`. Sans
 * cela, chaque adresse saisie ici creait un utilisateur Supabase, et les refus
 * d'inscription tombaient apres — d'ou des orphelins que rien ne ramassait.
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
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      },
    })

    // **La meme reponse dans les deux cas**, y compris quand Supabase refuse
    // parce que l'adresse est inconnue. Distinguer offrirait a quiconque de
    // tester si telle personne est cliente, sur un formulaire public.
    if (sendError && !/signups not allowed|not found/i.test(sendError.message)) {
      setError("L'envoi a échoué. Réessayez dans un instant.")
    } else {
      setSent(true)
    }
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
            Si un compte existe pour <strong>{email}</strong>, le lien est parti. Ouvrez-le depuis
            votre téléphone.
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

      <div className="flex flex-col gap-2 border-t border-rule pt-5">
        <Text size="sm" tone="muted">
          Pas encore de compte ?
        </Text>
        <Link href="/creer-mon-entreprise">Vous êtes artisan : créez votre entreprise</Link>
        <Link href="/creer-mon-compte">Vous êtes particulier : créez votre compte</Link>
      </div>
    </PublicShell>
  )
}
