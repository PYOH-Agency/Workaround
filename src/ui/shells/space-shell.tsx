import Link from 'next/link'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { SignOut } from '@/ui/molecules/sign-out'
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
  children,
}: {
  alsoCompany?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-6 py-3">
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
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <SignOut />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
        {children}
      </main>
    </div>
  )
}
