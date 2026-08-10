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
  aside,
  children,
}: {
  companyName?: string
  /**
   * Ce que cette personne peut. Facultatif : les ecrans du backoffice n'ont
   * aucune appartenance artisanale, et la navigation ne leur propose alors que
   * ce qui n'exige rien.
   */
  access?: Access
  /**
   * Ce qu'on consulte **pendant** qu'on agit : le montant d'une situation en
   * cours de saisie, l'etat de l'argent d'un chantier, ses documents.
   *
   * Une disposition et non un composant — au meme titre que `max-w-5xl` en est
   * une. Ces blocs vivaient sous la colonne, donc hors du champ de vision au
   * moment exact ou ils comptent : sur une situation de douze lignes, on tapait
   * un pourcentage et le montant qu'on etait en train de facturer se trouvait
   * six ecrans plus bas.
   *
   * `sticky` et non `fixed` : la colonne doit s'arreter avec le contenu, pas
   * flotter au-dessus du pied de page. Sous 900 px l'aside s'empile apres la
   * colonne principale — l'ordre du DOM est deja le bon, il n'y a rien a
   * reordonner.
   */
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <AppHeader companyName={companyName} access={access} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        {aside ? (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
            <div className="flex min-w-0 flex-col gap-8">{children}</div>
            <aside className="flex flex-col gap-4 lg:sticky lg:top-8">{aside}</aside>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
