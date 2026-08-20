import { signOut } from '@/actions/session'
import { Button } from '@/ui/atoms/button'

/**
 * Composant serveur : un formulaire qui declenche une server action n'a besoin
 * d'aucun JavaScript client — meme raison que `Button` lui-meme.
 *
 * `ghost` : la sortie est toujours a portee, jamais mise en avant.
 */
export function SignOut() {
  return (
    <form action={signOut}>
      <Button type="submit" tone="ghost" size="md">
        Se déconnecter
      </Button>
    </form>
  )
}
