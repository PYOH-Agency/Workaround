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
import { recordRequesterIntent } from './actions'

/**
 * Trois lignes de valeur, jamais un argumentaire.
 *
 * Le particulier n'a aucune raison de creer un compte : contrairement a
 * l'artisan, rien ne l'y pousse. **La troisieme ligne est la seule qui se
 * remplit des le premier jour** — c'est elle qui justifie l'atterrissage sur
 * `/mon-repertoire` plutot que sur des logements vides.
 */
const VALUE = [
  'Qui est intervenu chez vous, et quand',
  'Ce que vous avez signé, et pour combien',
  'Les artisans que vous voulez rappeler',
]

/**
 * L'inscription du particulier.
 *
 * Deux champs, pas trois. `requester.name` est `notNull` et sert dans chaque
 * courriel — l'ecrire vide pour gagner un champ, c'est se garantir des
 * « Bonjour , ». Enchainer sur une premiere entree de repertoire a ete ecarte :
 * ce serait le tunnel qu'on refuse a l'artisan, impose a quelqu'un qui vient
 * d'arriver.
 */
export default function SignUpRequesterPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [sent, setSent] = useState(false)
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

    const form = new FormData()
    form.set('email', email)
    form.set('name', name)

    try {
      const state = await recordRequesterIntent({}, form)
      if (state.error) {
        setError(state.error)
        return
      }

      // Rien a envoyer si elle etait deja connectee : son dossier est cree et
      // l'action a demande la navigation. On teste le drapeau plutot que de
      // compter sur le `catch` ci-dessous, qui avalerait ce signal-la.
      if (!state.sendLink) return

      const { error: sendError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm` },
      })

      if (sendError) setError("L'envoi a échoué. Réessayez dans un instant.")
      else setSent(true)
    } catch {
      setError("L'envoi a échoué. Réessayez dans un instant.")
    } finally {
      setSending(false)
    }
  }

  return (
    <PublicShell variant="plain">
      <div className="flex flex-col gap-4">
        <Heading level={1}>Gardez la trace de vos travaux</Heading>
        <ul className="flex flex-col gap-2">
          {VALUE.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1 text-verified" aria-hidden="true">
                <Icon name="check" size="sm" />
              </span>
              <Text size="sm" tone="soft" as="span">
                {line}
              </Text>
            </li>
          ))}
        </ul>
      </div>

      {sent ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-card border border-verified bg-verified-bg px-5 py-4 text-verified"
        >
          <Icon name="check" />
          <Text as="span">
            Lien envoyé à <strong>{email}</strong>. Ouvrez-le pour entrer.
          </Text>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <Field label="Votre nom" required>
            {(p) => (
              <Input
                {...p}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>

          <Field label="E-mail" help="Pas de mot de passe : on vous envoie un lien." required>
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

          <Text size="sm" tone="muted">
            En continuant, vous acceptez notre{' '}
            <Link href="/confidentialite" newTab>
              politique de protection des données
            </Link>
            .
          </Text>

          {error && (
            <div
              role="alert"
              className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
            >
              {error}
            </div>
          )}

          <Button type="submit" size="lg" pending={sending}>
            {sending ? 'Envoi…' : 'Créer mon compte'}
          </Button>
        </form>
      )}
    </PublicShell>
  )
}
