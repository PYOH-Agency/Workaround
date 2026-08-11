import Link from 'next/link'
import { Lockup } from '@/ui/brand/lockup'
import { AppNav } from '@/ui/molecules/app-nav'
import { staffNavGroups } from '@/ui/molecules/app-nav-routes'
import { SignOut } from '@/ui/molecules/sign-out'
import { ThemeToggle } from '@/ui/molecules/theme-toggle'

/**
 * Le gabarit des ecrans internes.
 *
 * Distinct d'`AppShell` : le back-office portait jusqu'ici la navigation de
 * l'artisan, avec un `access` facultatif dont le seul role etait de la masquer.
 * Une coquille dediee supprime ce detour — et rend impossible qu'une entree
 * artisanale reapparaisse un jour dans un ecran interne.
 *
 * **Elle passe `staffNavGroups` explicitement**, et c'est ce qui remplace le
 * reniflage d'URL. Tant que les deux publics partageaient `AppShell`, `AppNav`
 * devait deviner a qui elle s'adressait depuis le chemin, sur une liste de
 * prefixes qu'il fallait tenir a jour — et son auteur reconnaissait qu'une
 * route interne ajoutee plus tard heriterait de la navigation de l'artisan.
 * Ici la question ne se pose plus : l'ecran qui recoit ces entrees est celui
 * qui les demande.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
          <Link href="/supervision" className="rounded-badge" aria-label="Supervision">
            <Lockup size="sm" />
          </Link>

          <AppNav groups={staffNavGroups} />

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
