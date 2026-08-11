'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Heading } from '@/ui/atoms/heading'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { Notice } from '@/ui/molecules/notice'

/**
 * Trente secondes avant de pouvoir renvoyer.
 *
 * Un choix d'ergonomie, pas la limite reelle : `email_sent = 2` par heure tant
 * que le SMTP applicatif n'est pas en service. Les deux se recaleront ensemble.
 */
const RESEND_AFTER_S = 30

/**
 * Le vrai trou de conversion.
 *
 * Dans un produit sans mot de passe, l'entonnoir ne finit pas au clic sur
 * « Recevoir » : **il finit dans la boite mail**. Cet ecran est donc traite
 * comme un ecran, pas comme un encadre de confirmation vert.
 *
 * Chacune de ses quatre phrases desamorce une raison connue d'abandon : le
 * doute sur l'appareil, le doute sur ce qui a ete enregistre, le mail introuvable,
 * et le bouton de renvoi qui echoue en silence.
 */
export function SentStep({
  email,
  companyName,
  error,
  onChangeEmail,
  onResend,
}: {
  email: string
  companyName: string
  error?: string
  onChangeEmail: () => void
  /** Vrai si le lien est reparti — c'est ce verdict qui autorise le decompte. */
  onResend: () => Promise<boolean>
}) {
  const [remaining, setRemaining] = useState(RESEND_AFTER_S)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (remaining <= 0) return
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <span className="text-verified">
          <Icon name="check" />
        </span>
        <Heading level={1}>Un lien part vers {email}</Heading>
      </div>

      <Text tone="soft">
        Ouvrez-le depuis n’importe quel appareil. <strong>{companyName}</strong> vous attend.
      </Text>

      <Text size="sm" tone="muted">
        Il arrive en moins d’une minute. Rien ? Regardez dans les indésirables.
      </Text>

      {error && (
        <Notice tone="danger" alert>
          {error}
        </Notice>
      )}

      <Button
        type="button"
        tone="secondary"
        disabled={remaining > 0}
        pending={sending}
        onClick={async () => {
          setSending(true)
          const gone = await onResend()
          setSending(false)

          // Le decompte ne repart que sur un envoi parti. Le relancer quoi qu'il
          // arrive verrouillait trente secondes un bouton qui venait d'echouer,
          // et le message d'echec n'avait alors aucune suite a proposer.
          if (gone) setRemaining(RESEND_AFTER_S)
        }}
      >
        {remaining > 0 ? `Renvoyer dans 0:${String(remaining).padStart(2, '0')}` : 'Renvoyer le lien'}
      </Button>

      <Button type="button" tone="ghost" onClick={onChangeEmail}>
        Ce n’est pas la bonne adresse ?
      </Button>
    </div>
  )
}
