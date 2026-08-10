import Link from 'next/link'
import type { Access } from '@/domain/authorization'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { AppNav } from '@/ui/molecules/app-nav'
import { ThemeToggle } from '@/ui/molecules/theme-toggle'

/**
 * L'en-tete de l'artisan connecte.
 *
 * Porte le verrouillage de la marque — donc `Mark`, jamais `Seal` : ici la
 * marque s'exprime. Le sceau n'apparaitra que sur le passeport d'une autre
 * entreprise.
 *
 * **Et il porte la navigation** : un ecran qu'on ne peut pas atteindre n'existe
 * pas, et c'etait le sort de l'agenda, du passeport et de la verification.
 *
 * `AppNav` se tient dans son propre fichier parce qu'elle est cliente — elle
 * lit l'URL. L'en-tete, lui, reste serveur.
 *
 * `access` traverse jusqu'a elle : depuis M8, une entree ne s'affiche que si la
 * personne peut s'en servir.
 */
export function AppHeader({ companyName, access }: { companyName?: string; access?: Access }) {
  return (
    <header className="border-b border-rule bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <Link href="/devis" className="rounded-badge" aria-label="Accueil">
          <Lockup size="sm" />
        </Link>

        <AppNav access={access} />

        {companyName ? (
          <Text size="sm" tone="muted" as="span">
            {companyName}
          </Text>
        ) : null}

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
