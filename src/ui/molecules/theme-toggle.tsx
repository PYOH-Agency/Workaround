'use client'

import { Icon } from '@/ui/atoms/icon'

/**
 * Bascule clair / sombre.
 *
 * Aucun etat React, aucun effet. Le theme courant vit deja dans le DOM — dans
 * `data-theme` ou dans la preference systeme — et le dupliquer dans un `useState`
 * imposait un `setState` dans un effet, que le compilateur React refuse a juste
 * titre : c'est un rendu en cascade pour une information qu'on peut lire.
 *
 * Les deux pictogrammes sont rendus, et c'est la variante `dark:` qui decide
 * lequel se voit. Consequence agreable : aucun clignotement a l'hydratation, et
 * le bouton est correct des le rendu serveur.
 *
 * On ne propose que deux positions, pas de troisieme etat « systeme » : le
 * systeme est deja le defaut tant que rien n'est stocke.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement
    const explicit = root.dataset.theme
    const isDark = explicit
      ? explicit === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches

    const next = isDark ? 'light' : 'dark'
    root.dataset.theme = next
    try {
      localStorage.setItem('dq-theme', next)
    } catch {
      // Navigation privee : la preference ne survit pas a l'onglet. Sans gravite.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Changer de thème"
      className="inline-flex size-11 items-center justify-center rounded-control text-ink-soft hover:bg-rule/40"
    >
      <span className="inline-flex dark:hidden">
        <Icon name="moon" />
      </span>
      <span className="hidden dark:inline-flex">
        <Icon name="sun" />
      </span>
    </button>
  )
}
