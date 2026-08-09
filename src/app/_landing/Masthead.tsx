import { ButtonLink } from '@/ui/atoms/button-link'
import { Link } from '@/ui/atoms/link'
import { Lockup } from '@/ui/brand/lockup'

/**
 * L'en-tete de la page d'accueil.
 *
 * Un filet, pas une ombre : rien ne flotte au-dessus du contenu, et l'en-tete
 * ne suit pas le defilement. Sur un telephone tenu d'une main sur un chantier,
 * une barre collante mange le tiers de l'ecran pour un lien qu'on atteint en
 * remontant.
 *
 * La marque bicolore ici, jamais le sceau : sur une page qui porte l'en-tete de
 * la marque, le sceau ne designe qu'une AUTRE entreprise (spec §4.2).
 */
export function Masthead() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Lockup size="sm" />

        {/*
          Sur telephone il ne reste que « Se connecter » : l'annuaire vise le
          particulier, et le bouton de creation est a deux doigts plus bas dans
          l'accroche. Trois cibles de 44 px cote a cote sur 360 px de large se
          seraient chevauchees ou repliees sur deux lignes.
        */}
        <nav aria-label="Principal" className="flex items-center gap-5">
          <span className="hidden sm:block">
            <Link href="/annuaire" tone="bare">
              Annuaire
            </Link>
          </span>
          <Link href="/connexion" tone="bare">
            Se connecter
          </Link>
          <span className="hidden sm:block">
            <ButtonLink href="/inscription" tone="conversion">
              Créer mon compte
            </ButtonLink>
          </span>
        </nav>
      </div>
    </header>
  )
}
