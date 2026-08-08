import { ButtonLink } from '@/ui/atoms/button-link'
import { Link } from '@/ui/atoms/link'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'

/**
 * Le gabarit des deux pages d'entree publiques.
 *
 * Distinct de `PublicShell`, qui est un gabarit de **document** — un devis, une
 * facture, un passeport. Lui greffer une navigation commerciale et un lien
 * croise le denaturerait.
 *
 * Comme lui, il force le mode clair : une page d'accroche doit avoir la meme
 * tete pour tout le monde, et sa capture d'ecran doit ressembler a ce qu'on
 * voit.
 *
 * Le lien croise apparait en haut et en bas : pas d'ecran de choix a l'entree,
 * qui ajouterait un clic a tout le monde pour n'aider personne.
 */
export function LandingShell({
  audience,
  children,
}: {
  audience: 'pro' | 'demandeur'
  children: React.ReactNode
}) {
  const cross =
    audience === 'pro'
      ? { question: 'Vous êtes un particulier ?', label: 'Vérifier un artisan', href: '/verifier' }
      : { question: 'Vous êtes artisan ?', label: 'Créer mon compte', href: '/' }

  return (
    <div data-theme="light" className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-6 py-4">
          <Link href="/" tone="bare">
            <Lockup size="sm" />
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Text size="sm" tone="muted" as="span">
              {cross.question}
            </Text>
            <ButtonLink href={cross.href} tone="secondary">
              {cross.label}
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-rule bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-8">
          <Lockup size="sm" />
          <Link href="/confidentialite" tone="bare">
            <span className="text-sm">Protection des données</span>
          </Link>
          <div className="ml-auto">
            <Link href={cross.href}>{cross.label}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
