'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import type { Plan } from '@/domain/authorization'
import { setPlan } from './actions'

/**
 * La bascule d'abonnement, et sa confirmation.
 *
 * Seul le retrait est confirme. Passer en Pro n'enleve rien a personne et se
 * defait d'un clic ; repasser au gratuit **ferme l'equipe d'une entreprise qui
 * s'en sert** — les compagnons perdent l'agenda et le fil de chantier a la
 * seconde d'apres, sans que personne les ait prevenus. Confirmer les deux
 * gestes aurait dilue l'avertissement sur celui qui compte.
 *
 * Meme forme que `CancelButton` : la confirmation remplace le bouton au lieu de
 * s'ouvrir dans une modale. Le produit n'a pas de `Dialog` livre, et ce n'est
 * pas cet ecran-la qui doit en decider.
 */
export function PlanButton({
  companyId,
  companyName,
  plan,
}: {
  companyId: string
  companyName: string
  plan: Plan
}) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  const target: Plan = plan === 'pro' ? 'free' : 'pro'
  const apply = () => startTransition(async () => setPlan(companyId, target))

  if (plan !== 'pro') {
    return (
      <Button tone="secondary" pending={pending} onClick={apply}>
        {pending ? 'Bascule…' : 'Passer en Pro'}
      </Button>
    )
  }

  if (!confirming) {
    return (
      <Button tone="danger" onClick={() => setConfirming(true)}>
        Repasser au gratuit
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Text size="sm" tone="soft">
        Les compagnons de <strong>{companyName}</strong> perdront l’accès immédiatement.
      </Text>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button tone="danger-solid" pending={pending} onClick={apply}>
          {pending ? 'Bascule…' : 'Confirmer le retrait'}
        </Button>
        <Button tone="secondary" onClick={() => setConfirming(false)}>
          Garder l’offre Pro
        </Button>
      </div>
    </div>
  )
}
