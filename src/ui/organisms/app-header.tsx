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
 *
 * **Et il porte la navigation**, depuis M7 : un ecran qu'on ne peut pas
 * atteindre n'existe pas, et c'est exactement le sort qui attendait l'agenda.
 * Les trois ecrans quotidiens y figurent ; les autres — passeport,
 * verification, annuaire — n'ont toujours aucun point d'entree, ce qui est un
 * defaut anterieur a ce jalon et signale a part.
 */
const NAV = [
  { href: '/devis', label: 'Devis' },
  { href: '/factures', label: 'Factures' },
  { href: '/agenda', label: 'Agenda' },
]

export function AppHeader({ companyName }: { companyName?: string }) {
  return (
    <header className="border-b border-rule bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3">
        <Link href="/devis" className="rounded-badge" aria-label="Accueil">
          <Lockup size="sm" />
        </Link>

        <nav aria-label="Navigation principale" className="flex items-center gap-4">
          {NAV.map((entry) => (
            <Link key={entry.href} href={entry.href} className="rounded-badge">
              <Text size="sm" as="span">
                {entry.label}
              </Text>
            </Link>
          ))}
        </nav>

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
