import Link from 'next/link'
import { cn } from '@/ui/cn'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { AppNav } from '@/ui/molecules/app-nav'
import { spaceNavGroups } from '@/ui/molecules/app-nav-routes'
import { ReopenNotes } from '@/ui/molecules/reopen-notes'
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
      {/*
        Meme decoupe qu'`AppHeader`, et pour la meme raison mesuree : en 375 px
        cet en-tete s'empilait sur trois rangs — le logo, la navigation, puis le
        theme et la deconnexion — et pesait 117 px. La navigation prend un rang
        entier sous `lg`, donc la marque et les commandes de compte se partagent
        le premier. Au dela, tout revient sur un seul rang et rien n'est perdu
        au bureau.
      */}
      <header className="border-b border-rule bg-card">
        <div
          className={cn(
            'mx-auto flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-6 py-2',
            width,
          )}
        >
          {/*
            `flex` et non l'`inline` par defaut du lien : en ligne, il portait
            la hauteur de ligne de sa police et ouvrait 14 px de vide sous les
            jambages du logotype.
          */}
          <Link href="/mes-logements" className="flex rounded-badge" aria-label="Accueil">
            <Lockup size="sm" />
          </Link>

          {/*
            L'espace n'avait aucune navigation : on n'atteignait le repertoire
            que par un lien en fin de page des logements, et on n'en revenait
            que par le retour de l'en-tete d'ecran. Deux destinations de premier
            rang qui ne se voyaient pas l'une l'autre.

            C'est `AppNav`, la meme que l'atelier, et non une seconde : elle
            recoit ses entrees au lieu de les deduire, donc rien de l'artisan
            n'a eu besoin d'etre recopie.

            « Mon atelier » l'accompagne au lieu de cotoyer le theme et la
            deconnexion : c'est une destination, elle se lit avec les autres, et
            `min-h-11` lui donne la cible tactile des entrees qu'elle rejoint.
          */}
          <div className="order-last flex w-full flex-wrap items-center gap-x-4 lg:order-none lg:w-auto">
            <AppNav groups={spaceNavGroups} />

            {alsoCompany ? (
              <Link href="/devis" className="inline-flex min-h-11 items-center rounded-badge px-2">
                <Text size="sm" tone="muted" as="span">
                  Mon atelier
                </Text>
              </Link>
            ) : null}
          </div>

          {/*
            « Revoir les explications » a cote de la sortie : les deux sont des
            commandes de compte, et le geste inverse de la carte d'accueil se
            cherche la ou l'on cherche deja son compte (spec A2 §4).

            Elle tient ici, et c'est mesure : en 375 px cette rangee de
            commandes est deja passee sous la marque — elle dispose de 141 px
            libres, l'icone en prend 52. L'en-tete de l'artisan, lui, n'a pas
            cette marge (voir `AppHeader`).
          */}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <ReopenNotes />
            <SignOut />
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
