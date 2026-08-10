import Link from 'next/link'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { SignOut } from '@/ui/molecules/sign-out'
import { ThemeToggle } from '@/ui/molecules/theme-toggle'

/**
 * Le gabarit des ecrans internes.
 *
 * Distinct d'`AppShell` : le back-office portait jusqu'ici la navigation de
 * l'artisan, avec un `access` facultatif dont le seul role etait de la masquer.
 * Une coquille dediee supprime ce detour — et rend impossible qu'une entree
 * artisanale reapparaisse un jour dans un ecran interne.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
          <Link href="/supervision" className="rounded-badge" aria-label="Supervision">
            <Lockup size="sm" />
          </Link>
          <Link href="/supervision" className="rounded-badge">
            <Text size="sm" tone="muted" as="span">
              Supervision
            </Text>
          </Link>
          <Link href="/attestations" className="rounded-badge">
            <Text size="sm" tone="muted" as="span">
              Attestations
            </Text>
          </Link>
          <Link href="/entreprises" className="rounded-badge">
            <Text size="sm" tone="muted" as="span">
              Entreprises
            </Text>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <SignOut />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        {children}
      </main>
    </div>
  )
}
