import { dismissScreenNote } from '@/actions/screen-notes'
import { SCREEN_NOTES, type ScreenNoteKey } from '@/domain/screen-notes'
import { Button } from '@/ui/atoms/button'
import { Icon } from '@/ui/atoms/icon'
import { Text } from '@/ui/atoms/text'
import { Card } from '@/ui/molecules/card'

/**
 * Ce qu'un ecran dit de lui-meme, a la premiere visite, et une seule fois.
 *
 * **Dans le flux, en haut du `main`** — pas d'incrustation, pas de sequence,
 * pas d'ancrage au DOM. Un projecteur sur 375 px de large couvre ce qu'il
 * pretend montrer, et c'est la raison pour laquelle la spec ecarte le tutoriel
 * en surbrillance (§2.1). Ce qui reste tient dans une carte qui pousse la page
 * vers le bas, puis disparait.
 *
 * **Pas un `Notice`**, qui existe pour interrompre : ses trois tons sont des
 * etats — un danger, une mise en garde, une verification — et lui en ajouter un
 * neutre lui ferait dire l'inverse de ce qu'il dit. Une presentation n'alarme
 * pas ; elle se referme.
 *
 * Composant serveur : un formulaire qui declenche une server action n'a besoin
 * d'aucun JavaScript client, meme raison que `SignOut`.
 */
export function ScreenNote({
  note,
  dismissed,
}: {
  /** La page passe SA cle : le catalogue ne sait pas quel ecran porte quoi. */
  note: ScreenNoteKey
  /** Ce que cette personne a deja referme — voir `dismissedNotes`. */
  dismissed: ReadonlySet<string>
}) {
  if (dismissed.has(note)) return null

  return (
    <Card elevation="flat">
      <div className="flex items-start justify-between gap-3">
        <Text size="sm" tone="soft">
          {SCREEN_NOTES[note].text}
        </Text>
        {/*
          Les marges negatives rattrapent la cible tactile : le bouton fait ses
          44 px, sans pour autant epaissir la carte de la meme hauteur.
        */}
        <form action={dismissScreenNote.bind(null, note)} className="-my-2 -mr-2 shrink-0">
          <Button type="submit" tone="ghost" size="md">
            <Icon name="close" size="sm" />
            {/*
              Le nom du bouton, pour qui ne voit pas la croix. En `sr-only`
              plutot qu'en `aria-label` : `Button` n'expose aucune propriete
              ARIA, et `StepCard` nomme deja son chiffre de cette facon.
            */}
            <span className="sr-only">Fermer</span>
          </Button>
        </form>
      </div>
    </Card>
  )
}
