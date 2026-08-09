'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/ui/atoms/button'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Input } from '@/ui/atoms/input'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { requestCode, signQuote, type SignState } from './actions'

export function SignatureBlock({ token, phoneHint }: { token: string; phoneHint: string }) {
  const [state, setState] = useState<SignState>({})
  const [pending, startTransition] = useTransition()

  // Champs controles a dessein : React reinitialise un formulaire non controle
  // apres chaque action. Sur un code refuse, le nom et l'e-mail disparaissaient,
  // et la validation HTML bloquait ensuite toute nouvelle tentative — sans rien
  // afficher. Le client restait coince sans comprendre pourquoi.
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')

  if (state.signed) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-card border border-verified bg-verified-bg px-5 py-4 text-verified"
      >
        <Icon name="check" />
        <Text as="span">
          <strong>Devis signé.</strong> Vous en recevrez une copie.
        </Text>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-5 rounded-card border border-rule bg-card p-6">
      <div className="flex flex-col gap-1">
        <Heading level={3} as="h2">
          Signer ce devis
        </Heading>
        <Text size="sm" tone="soft">
          Un code vous sera envoyé par SMS au {phoneHint}. Il confirme que c’est bien vous qui
          signez.
        </Text>
      </div>

      {!state.codeSent ? (
        <div className="self-start">
          <Button
            size="lg"
            pending={pending}
            onClick={() => startTransition(async () => setState(await requestCode(token, {})))}
          >
            {pending ? 'Envoi…' : 'Recevoir le code'}
          </Button>
        </div>
      ) : (
        <form
          action={(form) =>
            startTransition(async () => setState(await signQuote(token, state, form)))
          }
          className="flex flex-col gap-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Votre nom" required>
              {(p) => (
                <Input
                  {...p}
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </Field>
            <Field label="Votre e-mail" required>
              {(p) => (
                <Input
                  {...p}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="sm:max-w-[12rem]">
            <Field label="Code reçu par SMS" required>
              {(p) => (
                <Input
                  {...p}
                  name="code"
                  variant="code"
                  inputMode="numeric"
                  maxLength={6}
                  // Laisse iOS et Android proposer le code des sa reception :
                  // sur un formulaire de signature, chaque friction coute une
                  // signature.
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              )}
            </Field>
          </div>

          <Text size="sm" tone="muted">
            En signant, vous acceptez ce devis et son délai d’exécution. Votre nom, votre e-mail,
            le code reçu par SMS, votre adresse IP et l’empreinte du document sont conservés comme
            preuve.{' '}
            <Link href="/confidentialite" newTab>
              En savoir plus
            </Link>
            .
          </Text>

          {/*
            Le verrou n° 1 de l'AIPD. AVANT la signature, pas apres : c'est la
            fonction la plus structurante de son geste, et l'en informer ensuite
            reviendrait a le prevenir d'un traitement auquel il a deja
            contribue.
          */}
          <Text size="sm" tone="muted">
            <strong>Votre signature sert aussi de témoignage.</strong> Elle atteste que ce chantier
            a bien eu lieu, à cette date et à ce prix — ce qui rend vérifiables les chiffres publiés
            sur cette entreprise, au lieu qu’elle les déclare elle-même. Rien de ce qui vous
            identifie n’y figure.{' '}
            <Link href="/passeport/definitions" newTab>
              Ce que ces chiffres mesurent
            </Link>
            .
          </Text>

          {/* La terre cuite en fond : seule action de la page, aucune action destructive alentour. */}
          <div className="self-start">
            <Button type="submit" tone="conversion" size="lg" pending={pending}>
              {pending ? 'Signature…' : 'Signer le devis'}
            </Button>
          </div>
        </form>
      )}

      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}
    </section>
  )
}
