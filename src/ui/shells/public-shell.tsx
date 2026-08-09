import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { cn } from '@/ui/cn'

/**
 * Le gabarit du demandeur et des pages publiques.
 *
 * `data-theme="light"` force le clair meme si le systeme est en sombre : c'est
 * un document, il doit avoir la meme tete pour tout le monde et ressembler au
 * PDF qu'il accompagne. Les variables `--dq-*` etant heritees, poser l'attribut
 * sur un conteneur suffit — et la variante `dark:` ne s'active pas sous ce noeud
 * puisqu'elle cible `[data-theme='dark'] *`.
 *
 * `text-ink` sur ce meme conteneur n'est pas une redondance avec le `text-ink`
 * du `<body>`. Le `body` est **au-dessus** du noeud qui force le theme : sous
 * preference systeme sombre, son `text-ink` se resout en encre claire, et cette
 * couleur-la — une valeur, plus une variable — descend par heritage. Tout
 * element d'ici qui ne pose pas sa propre classe de couleur l'attrapait :
 * `PLOMBERIE DU PARCOURS` s'affichait en #F5F1E8 sur #F5F1E8, invisible, sur la
 * page publique qui est la raison d'etre du produit. Reposer `text-ink` **sous**
 * l'attribut le resout avec les variables claires et coupe l'heritage.
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
   * `page` pour l'annuaire et les definitions : un contenu de longueur libre,
   * qui n'est pas un document emis.
   *
   * `page` est ne d'un mesusage. L'annuaire et les definitions prenaient
   * `plain`, qui centre verticalement dans 448 px : sur un ecran de 1280, la
   * recherche s'ouvrait sur 250 px de vide et les raisons sociales se cassaient
   * sur trois lignes. Le vide et l'etroitesse sont justes pour un formulaire de
   * connexion, faux pour une liste de resultats.
   *
   * Une variante plutot qu'un quatrieme gabarit : ce sont les memes regles de
   * marque et le meme theme force, seule la mise en page differe.
   */
  variant?: 'document' | 'plain' | 'page'
  children: React.ReactNode
}) {
  const isPlain = variant === 'plain'

  return (
    <div data-theme="light" className="flex min-h-full flex-1 flex-col bg-surface text-ink">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center px-6 py-3">
          <Lockup size="sm" />
        </div>
      </header>

      <main
        className={cn(
          'mx-auto flex w-full flex-1 flex-col gap-8 px-6 py-10',
          isPlain ? 'max-w-md justify-center' : 'max-w-2xl',
        )}
      >
        {children}
      </main>

      {variant !== 'document' ? null : (
        <footer className="mx-auto w-full max-w-2xl px-6 py-8">
          <Text size="sm" tone="muted">
            Document émis avec D’équerre.
          </Text>
        </footer>
      )}
    </div>
  )
}
