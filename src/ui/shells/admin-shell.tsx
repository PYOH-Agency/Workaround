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
      {/*
        Meme decoupe qu'`AppHeader`, et pour la meme raison mesuree : en 375 px
        cet en-tete s'empilait sur trois rangs — le logo, la navigation, puis le
        theme et la deconnexion — et pesait 161 px, un cinquieme de l'ecran. La
        navigation prend un rang entier sous `lg`, donc la marque et les
        commandes de compte se partagent le premier : 109 px. Au dela, tout
        revient sur un seul rang et rien n'est perdu au bureau.
      */}
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-6 py-2">
          {/*
            `flex` et non l'`inline` par defaut du lien : en ligne, il portait
            la hauteur de ligne de sa police et ouvrait 14 px de vide sous les
            jambages du logotype.
          */}
          <Link href="/supervision" className="flex rounded-badge" aria-label="Supervision">
            <Lockup size="sm" />
          </Link>

          <div className="order-last w-full lg:order-none lg:w-auto">
            <AppNav groups={staffNavGroups} />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
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
