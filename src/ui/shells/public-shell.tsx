import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'

/**
 * Le gabarit du demandeur et des pages publiques.
 *
 * `data-theme="light"` force le clair meme si le systeme est en sombre : c'est
 * un document, il doit avoir la meme tete pour tout le monde et ressembler au
 * PDF qu'il accompagne. Les variables `--dq-*` etant heritees, poser l'attribut
 * sur un conteneur suffit — et la variante `dark:` ne s'active pas sous ce noeud
 * puisqu'elle cible `[data-theme='dark'] *`.
 *
 * C'est aussi le seul gabarit sous lequel la terre cuite est autorisee en fond
 * de bouton, parce qu'il n'y a jamais d'action destructive a cote.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center px-6 py-3">
          <Lockup size="sm" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-2xl px-6 py-8">
        <Text size="sm" tone="muted">
          Document émis avec D’équerre.
        </Text>
      </footer>
    </div>
  )
}
