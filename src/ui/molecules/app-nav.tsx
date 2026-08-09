'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Text } from '@/ui/atoms/text'
import { cn } from '@/ui/cn'
import { isCurrent, navGroups, showsNav } from './app-nav-routes'

/**
 * La navigation de l'artisan.
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
 * Passage a la ligne plutot qu'un menu : l'artisan est sur un chantier, une
 * main prise. Un menu cache exactement ce que ce composant existe pour montrer.
 */
export function AppNav() {
  const pathname = usePathname()
  if (!showsNav(pathname)) return null

  return (
    <nav
      aria-label="Navigation principale"
      className="flex flex-wrap items-center gap-x-6 gap-y-1"
    >
      {navGroups.map((group) => (
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
                    current ? 'border-link' : 'border-transparent hover:border-rule',
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
