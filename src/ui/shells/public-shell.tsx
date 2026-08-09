import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { cn } from '@/ui/cn'

/**
 * Le gabarit du demandeur et des pages publiques.
 *
 * `data-theme="light"` force le clair meme si le systeme est en sombre : c'est
 * un document, il doit avoir la meme tete pour tout le monde et ressembler au
 * PDF qu'il accompagne.
 *
 * L'attribut n'agit pas par heritage : c'est `tokens.css` qui le rend valable
 * sur un conteneur, en declarant les variables sous `[data-theme='light']` et
 * en excluant le sous-arbre de la variante `dark:`. Les deux vont ensemble —
 * une seule des deux moities donne un rendu hybride, variables claires et
 * utilitaires sombres.
 *
 * C'est aussi le seul gabarit sous lequel la terre cuite est autorisee en fond
 * de bouton, parce qu'il n'y a jamais d'action destructive a cote.
 */
export function PublicShell({
  variant = 'document',
  children,
}: {
  /**
   * `document` pour un devis ou un passeport : large, avec la mention d'emission.
   * `plain` pour la connexion et l'inscription — un formulaire court centre, ou
   * la mention « document emis » n'aurait aucun sens.
   *
   * Une variante plutot qu'un quatrieme gabarit : ce sont les memes regles de
   * marque et le meme theme force, seule la mise en page differe.
   */
  variant?: 'document' | 'plain'
  children: React.ReactNode
}) {
  const isPlain = variant === 'plain'

  return (
    <div data-theme="light" className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center px-6 py-3">
          <Lockup size="sm" />
        </div>
      </header>

      <main
        className={cn(
          'mx-auto flex w-full flex-1 flex-col gap-8 px-6',
          isPlain ? 'max-w-md justify-center py-10' : 'max-w-2xl py-10',
        )}
      >
        {children}
      </main>

      {isPlain ? null : (
        <footer className="mx-auto w-full max-w-2xl px-6 py-8">
          <Text size="sm" tone="muted">
            Document émis avec D’équerre.
          </Text>
        </footer>
      )}
    </div>
  )
}
