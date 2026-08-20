import Link from 'next/link'
import type { Access } from '@/domain/authorization'
import { Text } from '@/ui/atoms/text'
import { Lockup } from '@/ui/brand/lockup'
import { AppNav } from '@/ui/molecules/app-nav'
import { visibleGroups } from '@/ui/molecules/app-nav-routes'
import { SignOut } from '@/ui/molecules/sign-out'
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
 *
 * **Compact, et la mesure dit pourquoi.** Au navigateur, sur l'accueil en
 * 375 px : l'en-tete faisait 238 px, soit 29 % d'un ecran de 812 px consommes
 * avant le moindre contenu. Le repli libre l'empilait sur cinq rangs — le logo,
 * les deux lignes de navigation, la raison sociale seule, puis le theme et la
 * deconnexion seuls a leur tour. Il en fait trois, et 158 px : l'identite (logo
 * + raison sociale) et les commandes de compte partagent le premier, la
 * navigation prend les suivants. Qui rend a ce bloc son repli libre et son
 * `py-3` rend aussi les 80 px, et les reprend a l'artisan.
 */
export function AppHeader({ companyName, access }: { companyName?: string; access: Access }) {
  return (
    <header className="border-b border-rule bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-6 py-2">
        {/*
          L'identite en une colonne : la raison sociale SOUS le logotype, et non
          a cote des liens. Flottant a la hauteur de la navigation et sans
          etiquette, elle se lisait comme une entree de plus. Sous la marque,
          elle dit ce qu'elle est — de quelle entreprise cet atelier est
          l'atelier — et le style `label` acheve de la distinguer d'un lien :
          capitales, graisse, aucune couleur de lien. Elle se tronque plutot que
          de pousser les commandes a la ligne suivante.

          `flex` sur le lien, et non l'`inline` par defaut : en ligne, il
          portait la hauteur de ligne de sa police et ouvrait 14 px de vide sous
          les jambages du logotype. `leading-none` sur l'enveloppe de
          l'etiquette pour la meme raison : `truncate` exige un bloc, et un bloc
          herite ici du corps de 16 px du document — 10 px de vide de plus
          autour d'un texte de 14.
        */}
        <div className="flex min-w-0 flex-1 flex-col lg:flex-none">
          <Link href="/" className="flex self-start rounded-badge" aria-label="Accueil">
            <Lockup size="sm" />
          </Link>

          {companyName ? (
            <span className="block truncate leading-none" title={companyName}>
              <Text size="label" tone="muted" as="span">
                {companyName}
              </Text>
            </span>
          ) : null}
        </div>

        {/*
          Les entrees se calculent ici, sur le serveur : `AppNav` ne sait que
          marquer la page courante, et c'est ce qui lui permet de servir aussi
          l'espace du demandeur. La table des capacites, elle, ne traverse pas
          la frontiere client.

          `w-full` en dessous de `lg`, et c'est ce qui fait les 80 px : la
          navigation prend un rang entier, donc l'identite et les commandes de
          compte se partagent le premier au lieu d'en prendre un chacune. Au
          dela, les trois tiennent sur un seul rang.

          `order-last` seulement, jamais un deplacement dans le DOM : l'ordre du
          document reste marque, navigation, compte — donc l'ordre au clavier
          aussi, a toute largeur. Et si l'identite porte `flex-1`, c'est qu'un
          conteneur qui se replie passe a la ligne AVANT de retrecir : a base
          automatique, une raison sociale un peu longue chassait les commandes
          sur un quatrieme rang au lieu de se tronquer.
        */}
        <div className="order-last w-full lg:order-none lg:w-auto">
          <AppNav groups={visibleGroups(access)} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <SignOut />
        </div>
      </div>
    </header>
  )
}
