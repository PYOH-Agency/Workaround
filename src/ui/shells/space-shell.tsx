import Link from 'next/link'
import { cn } from '@/ui/cn'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { ThemeToggle } from '@/ui/molecules/theme-toggle'

/**
 * Le gabarit du demandeur connecte.
 *
 * `max-w-2xl` plutot que le `max-w-5xl` de l'atelier : le demandeur lit son
 * dossier, il ne saisit pas de tableau de lignes.
 *
 * `alsoCompany` est la contrepartie de la decision « l'entreprise l'emporte » :
 * un artisan qui fait refaire sa toiture atterrit dans son atelier, et sans ce
 * lien il n'atteindrait jamais son propre dossier.
 */
export function SpaceShell({
  alsoCompany = false,
  aside,
  layout = 'reading',
  children,
}: {
  alsoCompany?: boolean
  /**
   * Les pieces du dossier — documents, garanties — a cote du fil plutot que
   * dessous.
   *
   * Le demandeur ouvre son chantier pour deux raisons : voir ou ca en est, et
   * retrouver un document. Empiler la seconde sous la premiere obligeait a
   * traverser tout le fil pour atteindre le devis signe.
   *
   * La colonne s'elargit quand il y en a deux — `max-w-2xl` est calibre pour
   * une seule colonne de lecture, et deux colonnes dedans donneraient deux
   * mesures illisibles.
   */
  aside?: React.ReactNode
  /**
   * `wide` pour un ecran qui compare plutot qu'il ne lit — le repertoire et son
   * tableau. `max-w-2xl` est calibre pour une colonne de lecture ; quatre
   * colonnes dedans defileraient lateralement pour rien.
   */
  layout?: 'reading' | 'wide'
  children: React.ReactNode
}) {
  const width = aside || layout === 'wide' ? 'max-w-4xl' : 'max-w-2xl'

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-rule bg-card">
        <div className={cn('mx-auto flex w-full items-center gap-4 px-6 py-3', width)}>
          <Link href="/mes-logements" className="rounded-badge" aria-label="Accueil">
            <Lockup size="sm" />
          </Link>
          {alsoCompany ? (
            <Link href="/devis" className="rounded-badge">
              <Text size="sm" tone="muted" as="span">
                Mon atelier
              </Text>
            </Link>
          ) : null}
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className={cn('mx-auto flex w-full flex-1 flex-col gap-8 px-6 py-10', width)}>
        {aside ? (
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_16.5rem]">
            <div className="flex min-w-0 flex-col gap-8">{children}</div>
            <aside className="flex flex-col gap-4 md:sticky md:top-8">{aside}</aside>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
