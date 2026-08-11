'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/ui/atoms/button'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Input } from '@/ui/atoms/input'
import { Link } from '@/ui/atoms/link'
import { Separator } from '@/ui/atoms/separator'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'
import { Notice } from '@/ui/molecules/notice'
import { PublicShell } from '@/ui/shells/public-shell'
import { invitationPending } from './actions'

/**
 * Le seul endroit ou le refus de `/auth/confirm` peut se dire.
 *
 * La route redirige, elle n'a pas d'ecran a elle. Sans ce message, un lien
 * expire ramene sur un formulaire muet, que l'on croit alors en panne — et on
 * reclique le meme lien mort au lieu d'en demander un neuf.
 *
 * Un composant a part, et non une ligne dans la page : `useSearchParams`
 * interdit le prerendu du sous-arbre qui le lit. Isole, il ne coute que ces
 * quelques lignes ; lu dans la page, il livrerait un ecran de connexion vide
 * jusqu'a l'hydratation.
 */
function Refusal() {
  if (useSearchParams().get('erreur') !== 'lien_invalide') return null

  return (
    <Notice tone="danger" alert>
      Ce lien n’est plus valable. Demandez-en un nouveau.
    </Notice>
  )
}

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
 *
 * **Une exception, et une seule : l'invite.** Le compagnon que son patron vient
 * d'inviter n'a jamais eu de compte, et aucune porte d'inscription ne lui
 * convient. Son invitation en attente vaut autorisation — voir
 * `invitationAwaits`, dans `services/membership`.
 */
export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()

    // L'invite d'abord : lui seul fait creer un compte par cette porte. La
    // reponse affichee, elle, reste la meme — le seul signal est l'arrivee d'un
    // courriel, qui exige l'acces a la boite.
    //
    // En panne, `false` : mieux vaut qu'un invite doive reessayer que de
    // laisser une lecture defaillante ouvrir la creation de compte a tous.
    const invited = await invitationPending(email).catch(() => false)

    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: invited,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      },
    })

    // **La meme reponse quoi qu'il arrive**, et l'echec est avale ici, comme
    // dans `resendQuoteLinks`.
    //
    // Trier les erreurs par leur libelle ne pouvait pas tenir : GoTrue ne leve
    // sa limite de frequence qu'APRES avoir trouve l'utilisateur. Deux
    // soumissions rapprochees rendaient donc « L'envoi a echoue » pour une
    // adresse connue et « Si un compte existe » pour une inconnue — soit
    // exactement l'oracle d'enumeration que ferme `shouldCreateUser: false`,
    // rouvert par la reponse elle-meme.
    //
    // Les envois reellement en panne se constatent dans les journaux Supabase ;
    // ils n'ont pas a se lire sur un formulaire public.
    setSent(true)
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
          <Suspense>
            <Refusal />
          </Suspense>

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

          <Button type="submit" size="lg">
            Recevoir le lien
          </Button>
        </form>
      )}

      <Separator />

      {/*
        Les sorties nomment le public, sans preambule — decision §3.6 de la spec
        des ecrans. « Pas encore de compte ? » demande de se ranger dans une
        categorie avant de l'avoir nommee, et c'est ici le seul ecran que les
        trois publics partagent : il doit les trier sans les juger.
      */}
      <div className="flex flex-col gap-2">
        <Link href="/creer-mon-entreprise">Vous êtes artisan : créez votre entreprise</Link>
        <Link href="/creer-mon-compte">Vous êtes particulier : créez votre compte</Link>
      </div>
    </PublicShell>
  )
}
