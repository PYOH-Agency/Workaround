import type { Access } from '@/domain/authorization'
import { AppHeader } from '@/ui/organisms/app-header'

/**
 * Le gabarit de l'artisan connecte : dense, mode sombre disponible.
 *
 * `max-w-5xl` plutot que le `max-w-2xl` des ecrans actuels : un tableau de
 * lignes de devis avec sa ventilation de TVA etouffe en dessous.
 */
export function AppShell({
  companyName,
  access,
  children,
}: {
  companyName?: string
  /**
   * Ce que cette personne peut. Facultatif : les ecrans du backoffice n'ont
   * aucune appartenance artisanale, et la navigation ne leur propose alors que
   * ce qui n'exige rien.
   */
  access?: Access
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <AppHeader companyName={companyName} access={access} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        {children}
      </main>
    </div>
  )
}
