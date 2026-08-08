import { AppHeader } from '@/ui/organisms/app-header'

/**
 * Le gabarit de l'artisan connecte : dense, mode sombre disponible.
 *
 * `max-w-5xl` plutot que le `max-w-2xl` des ecrans actuels : un tableau de
 * lignes de devis avec sa ventilation de TVA etouffe en dessous.
 */
export function AppShell({
  companyName,
  children,
}: {
  companyName?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <AppHeader companyName={companyName} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        {children}
      </main>
    </div>
  )
}
