'use client'

import { useState, useTransition } from 'react'
import { issueBalance, issueDeposit, issueProgress, type InvoiceFormState } from '@/actions/invoices'
import { Button } from '@/ui/atoms/button'
import { ButtonLink } from '@/ui/atoms/button-link'
import { Input } from '@/ui/atoms/input'
import { Text } from '@/ui/atoms/text'
import { Field } from '@/ui/molecules/field'

/**
 * Emission depuis un devis signe.
 *
 * Le solde n'a pas de champ de saisie : il vaut exactement ce qui reste. Un
 * montant libre garantirait des ecarts avec le devis, or l'ecart devis/facture
 * est la metrique reine du passeport.
 */
export function InvoiceActions({
  quoteId,
  remaining,
  canIssueSituation,
}: {
  quoteId: string
  remaining: string
  /** L'offre Pro ouvre la situation ligne par ligne. Le pourcentage global
   *  reste ouvert a tous : le retirer serait une regression du gratuit. */
  canIssueSituation: boolean
}) {
  const [state, setState] = useState<InvoiceFormState>({})
  const [percent, setPercent] = useState('30')
  const [pending, startTransition] = useTransition()

  const run = (action: () => Promise<InvoiceFormState>) =>
    startTransition(async () => setState(await action()))

  const share = Number(percent)
  const invalidShare = !Number.isFinite(share) || share <= 0 || share > 100

  return (
    /*
      Plus de titre « Facturer » ici : la section « Facturation » de la fiche le
      porte desormais, et les deux cote a cote se repetaient. Ce bloc n'est plus
      une section — c'est le panneau d'action d'une section qui en a une.
    */
    <div className="flex flex-col gap-4 rounded-card border border-rule bg-card p-5">
      {/*
        `remaining` arrive deja formate par la page : le `data-testid` ne porte
        donc que le nombre, et le symbole reste a l'exterieur — un test l'affirme
        en correspondance exacte.
      */}
      <Text size="sm" tone="soft">
        Reste à facturer : <span data-testid="reste-a-facturer">{remaining}</span> €
      </Text>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <Field label="Pourcentage">
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            )}
          </Field>
        </div>

        <Button
          disabled={pending || invalidShare}
          onClick={() => run(() => issueDeposit(quoteId, share, {}))}
        >
          Facture d’acompte
        </Button>

        <Button
          tone="secondary"
          disabled={pending || invalidShare}
          onClick={() => run(() => issueProgress(quoteId, share, {}))}
        >
          Situation de travaux
        </Button>

        <Button tone="secondary" disabled={pending} onClick={() => run(() => issueBalance(quoteId, {}))}>
          Facture de solde
        </Button>

        {/* `ButtonLink`, pas `Button` : le HTML distingue agir et naviguer. */}
        {canIssueSituation && (
          <ButtonLink href={`/devis/${quoteId}/situation`} tone="secondary">
            Nouvelle situation
          </ButtonLink>
        )}
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}
    </div>
  )
}
