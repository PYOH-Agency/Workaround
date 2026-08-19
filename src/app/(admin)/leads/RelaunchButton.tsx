'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { relaunch, type RelaunchState } from './actions'

const initialState: RelaunchState = {}

/**
 * Le seul geste de cette liste, et son retour, **dans la ligne concernee**.
 *
 * La liste est un composant serveur : afficher un verdict demande un etat
 * client quelque part. Le plus petit endroit possible est ici, un formulaire
 * par ligne — pas un `Toast` global, pas un parametre d'URL renvoye par un
 * `redirect`. Les deux poseraient le meme probleme : un message detache de sa
 * ligne, alors que le relecteur en relance plusieurs de suite et doit savoir
 * DE LAQUELLE on lui parle. Le message reste affiche tant qu'il ne relance pas
 * a nouveau, ce qu'un toast qui s'efface ne garantit pas.
 *
 * `role="status"` : le retour arrive apres coup, sans changer de page, et un
 * lecteur d'ecran ne le verrait pas sinon.
 */
export function RelaunchButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState(relaunch.bind(null, id), initialState)

  return (
    <form action={action} className="flex flex-col items-start gap-1.5">
      <Button type="submit" tone="secondary" pending={pending}>
        {pending ? 'Envoi…' : 'Relancer'}
      </Button>

      {state.message && (
        <Text as="span" size="sm" tone="muted">
          <span role="status">{state.message}</span>
        </Text>
      )}
    </form>
  )
}
