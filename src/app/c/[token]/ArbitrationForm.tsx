'use client'

import { useActionState } from 'react'
import { Button } from '@/ui/atoms/button'
import { Text } from '@/ui/atoms/text'
import { answerDispute, type ArbitrationState } from './actions'

const initialState: ArbitrationState = {}

/**
 * Une question, deux reponses.
 *
 * **Les deux boutons ont le meme poids visuel.** Un primaire d'un cote
 * fabriquerait la reponse qu'il appelle : le client ne nous doit rien, ni de
 * repondre, ni de repondre dans un sens.
 *
 * La consequence du silence est dite ici aussi, pas seulement dans le message :
 * la taire rendrait l'abstention manipulable.
 */
export function ArbitrationForm({ token }: { token: string }) {
  // Aucun etat « merci » ici : `revalidatePath` reconstruit la page serveur,
  // qui rend elle-meme le message de cloture et remplace ce formulaire. Le
  // dupliquer cote client aurait fait du code mort — et deux messages a tenir
  // d'accord.
  const [state, action, pending] = useActionState(answerDispute.bind(null, token), initialState)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="verdict" value="upheld" tone="secondary" pending={pending}>
          Oui, c’est exact
        </Button>
        <Button type="submit" name="verdict" value="rejected" tone="secondary" pending={pending}>
          Non, ce n’est pas ce qui s’est passé
        </Button>
      </div>

      <Text size="sm" tone="muted">
        Vous pouvez aussi ne pas répondre : passé quatorze jours, la mesure initiale s’applique.
      </Text>

      {state.error && (
        <div
          role="alert"
          className="rounded-card border border-danger bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {state.error}
        </div>
      )}
    </form>
  )
}
