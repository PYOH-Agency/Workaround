import { reopenScreenNotes } from '@/actions/screen-notes'
import { Button } from '@/ui/atoms/button'
import { Icon } from '@/ui/atoms/icon'

/**
 * « Revoir les explications » : les notices refermees reviennent, toutes.
 *
 * **Rejouer, c'est EFFACER le rejet**, jamais poser un second drapeau : deux
 * mecanismes pour un meme etat divergeraient (spec A2 §4). Tout le geste tient
 * donc dans une suppression, et rien ici n'a d'etat a retenir.
 *
 * Composant serveur : un formulaire qui declenche une server action n'a besoin
 * d'aucun JavaScript client — meme raison que `SignOut`, dont ce bouton est le
 * voisin. Et molecule partagee pour la meme raison qu'elle : les deux coquilles
 * connectees la posent, et la loger dans l'une obligerait l'autre a en dependre.
 *
 * `ghost` : on la trouve quand on la cherche, elle ne dispute rien a la page.
 *
 * **Le libelle se replie en nom accessible sous `lg`, et c'est une mesure.** En
 * 375 px la premiere rangee des deux en-tetes est pleine au pixel pres : le
 * logotype (125 px), l'ecart (16 px) et les commandes de compte (186 px) font
 * 327 px pour 327 px disponibles. Le libelle en clair y pese 185 px de plus et
 * chasse les commandes sur un rang entier ; l'icone en pese 52, et la cible
 * tactile reste a 44 px. Qui rend le libelle visible sous `lg` rend aussi le
 * rang, et le reprend a qui lit sur un telephone.
 */
export function ReopenNotes() {
  return (
    <form action={reopenScreenNotes}>
      <Button type="submit" tone="ghost" size="md">
        <Icon name="help" />
        <span className="sr-only lg:not-sr-only">Revoir les explications</span>
      </Button>
    </form>
  )
}
