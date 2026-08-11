'use client'

import { useState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Icon } from '@/ui/atoms/icon'

/**
 * Une valeur longue, et le seul geste qu'on veut en faire.
 *
 * L'ecran dit « collez-la dans Google Agenda » et n'offrait rien pour la
 * prendre : il fallait selectionner quatre-vingt-dix caracteres a la souris,
 * sans en manquer un — sur l'ecran meme dont c'est le geste entier.
 *
 * Il reste aupres de son ecran plutot que de monter dans le design system :
 * un seul lecteur, et rien qui laisse penser qu'un second arrive. La regle est
 * la meme que pour `SituationForm` ou `BusyNotice`.
 *
 * Le retour d'etat ne s'efface pas tout seul apres trois secondes : sur un
 * geste dont on ne voit pas le resultat — le presse-papiers est invisible —,
 * une confirmation qui disparait laisse douter qu'elle ait eu lieu. Elle
 * s'efface au prochain clic.
 */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <code
        className="min-w-0 flex-1 rounded-control border border-rule bg-raised px-3 py-2 text-sm break-all text-ink"
        data-testid="abonnement"
      >
        {value}
      </code>

      <Button
        tone="secondary"
        onClick={() => {
          // `writeText` echoue hors contexte securise, et un bouton muet
          // laisserait croire que la copie a eu lieu. On ne prometra rien qu'on
          // ne sache tenir : l'etat ne passe a « copiee » que si elle l'est.
          navigator.clipboard.writeText(value).then(
            () => setCopied(true),
            () => setCopied(false),
          )
        }}
      >
        <Icon name={copied ? 'check' : 'copy'} size="sm" />
        {copied ? 'Adresse copiée' : label}
      </Button>
    </div>
  )
}
