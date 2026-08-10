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
import { recordCompanyIntent } from './actions'

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
  const [email, setEmail] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

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
            setStage('confirm')
          }}
        />
      )}

      {stage === 'confirm' && found && (
        <ConfirmStep
          establishment={found}
          missing={missing}
          onConfirm={() => setStage('email')}
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
