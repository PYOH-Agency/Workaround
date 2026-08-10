'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { SectionHeader } from '@/ui/molecules/section-header'
import { recordCompanyIntent } from './actions'

/**
 * Le troisieme temps.
 *
 * « Une seule fois : ensuite vous restez connecte » est la phrase la plus
 * rentable de l'onboarding, et presque aucun produit sans mot de passe ne la
 * dit. Sans elle, l'artisan suppose qu'il devra ouvrir sa boite mail chaque
 * matin, et il prefere un concurrent avec mot de passe.
 *
 * **Elle est liee par contrat a `[auth.sessions]`** : elle n'est vraie que
 * parce que la session ne meurt pas. Activer `timebox` la transformerait en
 * mensonge — le commentaire de `config.toml` nomme cet ecran pour cette raison.
 */
export function EmailStep({ siret, onSent }: { siret: string; onSent: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)

    try {
      // L'intention AVANT le lien : dans l'autre ordre, un echec d'ecriture
      // ferait atterrir la personne sans son SIRET.
      await recordCompanyIntent(email, siret)

      const { error: sendError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm` },
      })

      if (sendError) setError("L'envoi a échoué. Réessayez dans un instant.")
      else onSent(email)
    } catch {
      setError("L'envoi a échoué. Réessayez dans un instant.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <SectionHeader
        as="h1"
        label="Étape 3 sur 3"
        title="Où vous envoyer votre accès ?"
        lead="Pas de mot de passe à retenir. Un lien, un clic, vous êtes chez vous. Une seule fois : ensuite vous restez connecté."
      />

      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="E-mail" error={error ?? undefined} required>
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

        <Button type="submit" size="lg" pending={sending}>
          {sending ? 'Envoi…' : 'Recevoir mon lien'}
        </Button>

        <Text size="sm" tone="muted">
          En continuant, vous acceptez notre{' '}
          <Link href="/confidentialite" newTab>
            politique de protection des données
          </Link>
          .
        </Text>
      </form>
    </>
  )
}
