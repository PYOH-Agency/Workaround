'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import type { MentionGroup } from '@/domain/legal-mentions'
import type { Establishment } from '@/services/company-lookup'
import { Notice } from '@/ui/molecules/notice'
import { PublicShell } from '@/ui/shells/public-shell'
import { ConfirmStep } from './ConfirmStep'
import { EmailStep } from './EmailStep'
import { SentStep } from './SentStep'
import { SiretStep } from './SiretStep'
import { createCompanyNow, recordCompanyIntent } from './actions'

/**
 * L'inscription de l'artisan, en quatre temps.
 *
 * Un fichier par temps : la limite est a 250 lignes, et surtout chacun a une
 * seule chose a faire. L'orchestrateur ne connait que l'enchainement.
 *
 * **Le retour ne perd jamais l'etablissement trouve.** Une faute de frappe sur
 * l'adresse ne doit pas couter le tunnel entier.
 */
type Stage = 'siret' | 'confirm' | 'email' | 'sent'

/**
 * Le refus tombe a l'atterrissage, ou plus aucun ecran n'existe pour le porter.
 *
 * `/auth/confirm` ne sait que rediriger. Muette, cette redirection ramene
 * l'artisan a l'etape 1 sans un mot : il retape les memes quatorze chiffres et
 * se fait refuser une seconde fois, sans jamais apprendre pourquoi.
 *
 * Un composant a part, et non une ligne dans la page : `useSearchParams`
 * interdit le prerendu du sous-arbre qui le lit. Isole, il ne coute que ces
 * quelques lignes ; lu dans la page, il livrerait un tunnel vide jusqu'a
 * l'hydratation.
 */
function Unavailable() {
  if (useSearchParams().get('erreur') !== 'indisponible') return null

  return (
    <Notice tone="danger" alert>
      Cet établissement n’est plus disponible. Vérifiez le SIRET.
    </Notice>
  )
}

export default function SignUpCompanyPage() {
  const [stage, setStage] = useState<Stage>('siret')
  const [found, setFound] = useState<Establishment | null>(null)
  const [missing, setMissing] = useState<MentionGroup[]>([])
  const [signedIn, setSignedIn] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  /**
   * Le point ou les deux publics divergent.
   *
   * Deja connecte : l'adresse est prouvee, l'entreprise se cree, l'atelier
   * s'ouvre — `createCompanyNow` redirige elle-meme. Anonyme : cap sur l'etape
   * 3, ou la boite aux lettres fera la preuve.
   */
  async function confirm() {
    if (!signedIn) {
      setStage('email')
      return
    }

    setError(null)
    setCreating(true)
    try {
      const result = await createCompanyNow(found!.siret)
      if (result?.error) setError(result.error)
    } finally {
      setCreating(false)
    }
  }

  /**
   * Le renvoi rend son verdict, et l'ecran d'attente en depend.
   *
   * « Un bouton "Renvoyer" qui echoue en silence est pire que pas de bouton » —
   * c'est la phrase par laquelle la spec des ecrans §3.4 justifie le decompte.
   * Sans ce booleen, l'ecran ne pouvait ni le dire ni s'en servir.
   */
  async function resend() {
    setResendError(null)

    try {
      await recordCompanyIntent(email, found!.siret)

      const { error: sendError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm` },
      })
      if (sendError) throw sendError

      return true
    } catch {
      setResendError("L'envoi a échoué. Réessayez dans un instant.")
      return false
    }
  }

  return (
    <PublicShell variant="plain">
      {stage === 'siret' && (
        <Suspense>
          <Unavailable />
        </Suspense>
      )}

      {stage === 'siret' && (
        <SiretStep
          initialSiret={found?.siret ?? ''}
          onFound={(state) => {
            setFound(state.found!)
            setMissing(state.missing ?? [])
            setSignedIn(Boolean(state.signedIn))
            setStage('confirm')
          }}
        />
      )}

      {stage === 'confirm' && found && (
        <ConfirmStep
          establishment={found}
          missing={missing}
          error={error ?? undefined}
          pending={creating}
          onConfirm={confirm}
          onReject={() => setStage('siret')}
        />
      )}

      {stage === 'email' && found && (
        <EmailStep
          siret={found.siret}
          onSent={(sentTo) => {
            setEmail(sentTo)
            setStage('sent')
          }}
        />
      )}

      {stage === 'sent' && found && (
        <SentStep
          email={email}
          companyName={found.legalName}
          error={resendError ?? undefined}
          onChangeEmail={() => setStage('email')}
          onResend={resend}
        />
      )}
    </PublicShell>
  )
}
