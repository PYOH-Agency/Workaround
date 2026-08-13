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
 * voit. Et comme lui il repose `text-ink` sous l'attribut de theme — voir
 * `PublicShell` pour la raison : sans cela, tout element qui ne porte pas sa
 * propre classe de couleur herite de l'encre resolue par le `<body>`, donc
 * claire sur clair quand le systeme est en sombre.
 *
 * Le lien croise apparait en haut et en bas : pas d'ecran de choix a l'entree,
 * qui ajouterait un clic a tout le monde pour n'aider personne.
 *
 * Le logotype n'est pas un lien : les deux pages sont deja les points
 * d'entree, et le seul deplacement qui aurait un sens — vers l'autre public —
 * est deja porte, nomme, par le bouton croise. Sur la page pro il pointerait
 * vers la page courante, et sur la page demandeur il pointerait vers `/`, la
 * page de l'autre public : trompeur plutot qu'inutile.
 */
export function LandingShell({
  audience,
  children,
}: {
  audience: 'pro' | 'demandeur'
  children: React.ReactNode
}) {
  /**
   * Espace insecable avant le point d'interrogation — l'usage francais, et ici
   * une necessite de mise en page : a 375 px la question tient sur deux lignes
   * et le « ? » se retrouvait seul sur la seconde, en haut de la page.
   */
  const cross =
    audience === 'pro'
      ? { question: 'Vous êtes un particulier ?', label: 'Vérifier un artisan', href: '/verifier' }
      : { question: 'Vous êtes artisan ?', label: 'Créer mon compte', href: '/' }

  return (
    <div
      data-theme="light"
      data-dq-landing=""
      className="dq-landing flex min-h-full flex-1 flex-col bg-surface text-ink"
    >
      {/*
        Le fil a plomb : instrument decoratif, cale au bord du contenu, dont le
        plomb descend avec le scroll (`animation-timeline: scroll`). Aria-cache
        et sans prise tactile — il ne dit rien que la page ne dise deja, il lui
        donne une vie continue dans le vocabulaire du metier. Sa mise en scene
        vit dans `landing-motion.css`.
      */}
      <div className="dq-plumb" aria-hidden="true">
        <span className="dq-plumb-bob" />
      </div>
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-6 py-4">
          <Lockup size="sm" />
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
