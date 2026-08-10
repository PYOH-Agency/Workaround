'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { MentionGroup } from '@/domain/legal-mentions'
import type { Establishment } from '@/services/company-lookup'
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

export default function SignUpCompanyPage() {
  const [stage, setStage] = useState<Stage>('siret')
  const [found, setFound] = useState<Establishment | null>(null)
  const [missing, setMissing] = useState<MentionGroup[]>([])
  const [signedIn, setSignedIn] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  async function resend() {
    await recordCompanyIntent(email, found!.siret)
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm` },
    })
  }

  return (
    <PublicShell variant="plain">
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
          onChangeEmail={() => setStage('email')}
          onResend={resend}
        />
      )}
    </PublicShell>
  )
}
