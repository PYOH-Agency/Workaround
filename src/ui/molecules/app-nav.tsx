'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Text } from '@/ui/atoms/text'
import { cn } from '@/ui/cn'
import { isBackoffice, isCurrent, staffNavGroups, type NavGroup } from './app-nav-routes'

/**
 * La navigation d'un espace connecte — celui de l'artisan, celui du demandeur.
 *
 * Elle recoit ses entrees plutot qu'elle ne les deduit : c'est ce qui lui a
 * permis de servir les deux publics sans qu'un second composant n'apparaisse.
 * Ce qu'elle sait faire — marquer la page courante, tenir la cible tactile,
 * passer a la ligne — ne depend pas de qui la regarde ; ce que chacun peut
 * atteindre, si. L'appelant tranche donc la seconde question, et `AppHeader`
 * reste le seul a connaitre la table des capacites.
 *
 * Cliente, et c'est sa raison d'etre : `AppHeader` est un composant serveur, et
 * un composant serveur ne peut pas lire l'URL. La sortir dans son propre
 * fichier evite de verser `Lockup` et `Text` au client pour un seul
 * `usePathname()`.
 *
 * L'etat actif se marque **trois fois** : `aria-current` pour le lecteur
 * d'ecran, le contraste du texte, et un filet de 2 px. La couleur ne porte
 * jamais seule une information.
 *
 * Le survol ne change pas la couleur du texte, il change le filet : `Text` fixe
 * la sienne, et se battre en specificite contre elle donnerait un resultat
 * dependant de l'ordre des classes Tailwind.
 *
 * Le filet de survol prend `field` et non `rule` : `rule` est un filet de
 * separation, son contraste est volontairement faible et WCAG ne lui impose
 * rien ; un indicateur d'etat interactif, lui, doit tenir 3:1.
 *
 * Passage a la ligne plutot qu'un menu : l'artisan est sur un chantier, une
 * main prise. Un menu cache exactement ce que ce composant existe pour montrer.
 */
export function AppNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname()

  /*
    Le backoffice partage `AppShell` avec l'artisan, donc son en-tete, et ne
    peut pas se distinguer de lui cote serveur : ses ecrans n'ont aucune
    appartenance artisanale a transmettre. C'est donc l'URL qui tranche, ici,
    au seul endroit du produit qui la lit.

    Substitution et non effacement : l'ancienne regle masquait la navigation
    dans le backoffice, ce qui laissait le relecteur sans aucun moyen d'aller
    d'un ecran a l'autre.
  */
  const shown = isBackoffice(pathname) ? staffNavGroups : groups
  if (shown.length === 0) return null

  return (
    <nav
      aria-label="Navigation principale"
      className="flex flex-wrap items-center gap-x-6 gap-y-1"
    >
      {shown.map((group) => (
        <ul
          key={group.label}
          aria-label={group.label}
          className="flex flex-wrap items-center gap-x-3"
        >
          {group.entries.map((entry) => {
            const current = isCurrent(pathname, entry.href)

            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    // 44 px : le seuil que le socle s'impose deja pour `Input`.
                    // Avant, la cible faisait la hauteur du texte, soit 20 px.
                    'inline-flex min-h-11 items-center rounded-badge border-b-2 px-2',
                    current ? 'border-link' : 'border-transparent hover:border-field',
                  )}
                >
                  <Text size="sm" tone={current ? 'default' : 'muted'} as="span">
                    {entry.label}
                  </Text>
                </Link>
              </li>
            )
          })}
        </ul>
      ))}
    </nav>
  )
}
