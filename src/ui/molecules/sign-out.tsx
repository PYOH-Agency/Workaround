import { signOut } from '@/actions/session'
import { Button } from '@/ui/atoms/button'
import { Icon } from '@/ui/atoms/icon'

/**
 * Composant serveur : un formulaire qui declenche une server action n'a besoin
 * d'aucun JavaScript client — meme raison que `Button` lui-meme.
 *
 * `ghost` : la sortie est toujours a portee, jamais mise en avant.
 *
 * **Le libelle se replie sous `lg`, et c'est ce qui fait tenir la rangee.**
 * Ecrit en toutes lettres, « Se déconnecter » prenait 142 px dans la rangee la
 * plus disputee du telephone : la premiere ligne de l'en-tete etait pleine au
 * pixel pres — 327 px pour 327 disponibles —, ce qui chassait « Revoir les
 * explications » hors du mobile. Deux commandes secondaires, deux icones ; le
 * texte revient des qu'il y a la place.
 *
 * `sr-only` et non `aria-label` : le nom accessible reste « Se déconnecter » a
 * toute largeur, donc les parcours qui cliquent ce bouton par son nom
 * continuent de le trouver.
 */
export function SignOut() {
  return (
    <form action={signOut}>
      <Button type="submit" tone="ghost" size="md">
        <Icon name="logout" />
        <span className="sr-only lg:not-sr-only">Se déconnecter</span>
      </Button>
    </form>
  )
}
