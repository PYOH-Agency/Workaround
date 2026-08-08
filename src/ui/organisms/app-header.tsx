import Link from 'next/link'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { ThemeToggle } from '@/ui/molecules/theme-toggle'

/**
 * L'en-tete de l'artisan connecte.
 *
 * Porte le verrouillage de la marque — donc `Mark`, jamais `Seal` : ici la
 * marque s'exprime. Le sceau n'apparaitra que sur le passeport d'une autre
 * entreprise.
 */
export function AppHeader({ companyName }: { companyName?: string }) {
  return (
    <header className="border-b border-rule bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-3">
        <Link href="/devis" className="rounded-badge" aria-label="Accueil">
          <Lockup size="sm" />
        </Link>
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
