'use client'

import { useState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { requestAttestation } from './actions'

/** Le message que le demandeur enverra lui-meme : sa voix, pas la notre. */
function draft(pageUrl: string): string {
  return [
    'Bonjour, avant de vous confier ces travaux, pouvez-vous m’envoyer votre',
    'attestation de garantie décennale en cours de validité ?',
    `Voici ce que j’ai pu vérifier de mon côté : ${pageUrl}`,
    'Merci !',
  ].join(' ')
}

/**
 * Le second chemin : nous n'envoyons rien, et n'enregistrons aucun contact.
 *
 * **Deux decisions, et elles vont ensemble.**
 *
 * 1. *La copie echoue ou n'est pas autorisee : le bouton ne dit pas « copie ».*
 *    `writeText` echoue hors contexte securise et sous certaines permissions,
 *    et le presse-papiers est invisible : une confirmation mensongere se
 *    decouvre au moment du collage, dans une autre application, quand il est
 *    trop tard pour revenir. Meme regle que `CopyField`. En echange, l'echec
 *    n'est pas un cul-de-sac : le message s'affiche, a selectionner a la main.
 *
 * 2. *L'intention est enregistree APRES la copie, et seulement si elle a eu
 *    lieu.* Deux raisons. La technique d'abord : `writeText` doit partir dans
 *    la tache du clic — une server action attendue avant elle consommerait
 *    l'activation utilisateur, et Safari refuserait la copie. La juste ensuite :
 *    l'intention que nous mesurons est « le demandeur est reparti avec le
 *    message », et une copie ratee n'est pas cela.
 *
 * Si c'est l'enregistrement qui echoue, nous ne disons rien : l'entonnoir perd
 * une ligne, le demandeur a son message, et il ne doit rien a une page qui lui
 * a annonce qu'elle ne pouvait rien affirmer.
 */
export function CopyMessage({ siret, pageUrl }: { siret: string; pageUrl: string }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const message = draft(pageUrl)

  function record() {
    const form = new FormData()
    form.set('siret', siret)
    form.set('channel', 'copied')
    // Sans `await` ni `catch` bruyant : le geste du demandeur est deja acheve.
    void requestAttestation({}, form).catch(() => {})
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="self-start">
        <Button
          tone="secondary"
          size="lg"
          onClick={() => {
            navigator.clipboard.writeText(message).then(
              () => {
                setCopied(true)
                setFailed(false)
                record()
              },
              () => {
                setCopied(false)
                setFailed(true)
              },
            )
          }}
        >
          <Icon name={copied ? 'check' : 'copy'} size="sm" />
          {copied ? 'Message copié' : 'Copier le message'}
        </Button>
      </div>

      {copied && (
        <Text size="sm" tone="soft">
          Collez-le dans un SMS ou une messagerie. Nous n’envoyons rien et ne conservons aucune
          adresse.
        </Text>
      )}

      {failed && (
        <div className="flex flex-col gap-2" data-testid="copie-refusee">
          <Text size="sm" tone="soft">
            Votre navigateur n’a pas autorisé la copie. Voici le message, à sélectionner :
          </Text>
          <div className="rounded-control border border-rule bg-raised px-3 py-2 text-sm text-ink select-all">
            {message}
          </div>
        </div>
      )}
    </div>
  )
}
