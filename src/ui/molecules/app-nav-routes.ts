/**
 * Les entrees de la navigation de l'artisan, et les deux predicats qui en
 * decident l'affichage.
 *
 * Un fichier `.ts` separe de `app-nav.tsx`, pour une raison de test : vitest
 * tourne en environnement `node`, sans jsdom, et n'inclut que les fichiers
 * `.test.ts`. Importer le `.tsx` y ferait entrer React et `next/link` pour
 * verifier deux regles de chaine de caracteres.
 *
 * Aucun export ne commence par une majuscule : `check:ds` inventorie tout
 * export capitalise de `src/ui/` comme un composant, et refuserait ce qui ne
 * figure pas dans sa table.
 */

import { can, type Access, type Capability } from '@/domain/authorization'

export interface NavEntry {
  href: string
  label: string
  /**
   * Ce que l'entree exige, s'il y a lieu.
   *
   * **La navigation lit la MEME table que la garde.** Une seconde liste — « ce
   * qu'on affiche » a cote de « ce qu'on autorise » — divergerait en trois
   * jalons, et l'ecran finirait par proposer ce que le serveur refuse. Un lien
   * qui mene a un refus est pire que pas de lien.
   */
  capability?: Capability
}

export interface NavGroup {
  /** Annoncee par un lecteur d'ecran ; jamais affichee a l'ecran. */
  label: string
  entries: NavEntry[]
}

/**
 * Deux groupes, parce que les deux n'ont pas la meme frequence d'usage.
 *
 * Les aplatir donnerait le meme poids a « etablir un devis » et a « voir ou en
 * est mon attestation », ce qui est faux.
 *
 * `/annuaire` n'y figure pas : c'est l'ecran ou un *client* cherche un artisan,
 * en `PublicShell`, et y envoyer l'artisan le sort de son espace sans retour.
 * Le besoin reel — voir sa propre fiche — est servi depuis `/mon-passeport`.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Suivi quotidien',
    entries: [
      { href: '/devis', label: 'Devis' },
      { href: '/factures', label: 'Factures', capability: 'invoice.issue' },
      { href: '/agenda', label: 'Agenda' },
    ],
  },
  {
    label: 'Mon entreprise',
    entries: [
      { href: '/mon-passeport', label: 'Passeport', capability: 'passport.manage' },
      { href: '/verification', label: 'Vérification', capability: 'legal.write' },
      { href: '/equipe', label: 'Équipe', capability: 'team.manage' },
    ],
  },
]

/**
 * Les groupes que cette personne-la peut voir.
 *
 * Un groupe dont toutes les entrees tombent disparait : une etiquette de
 * groupe annoncee sur une liste vide est un bruit pour le lecteur d'ecran.
 *
 * Sans `access` — le backoffice, ou toute page qui ne le transmet pas —, seules
 * les entrees sans exigence subsistent. C'est volontairement le repli le plus
 * pauvre : mieux vaut un lien manquant qu'un lien qui refuse.
 */
export function visibleGroups(access: Access | undefined): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => !entry.capability || can(access, entry.capability)),
    }))
    .filter((group) => group.entries.length > 0)
}

/**
 * Le backoffice partage `AppShell` avec l'artisan, donc son en-tete.
 *
 * La liste est **negative**, et c'est un choix assume : une route de backoffice
 * ajoutee plus tard heriterait de la navigation de l'artisan tant qu'on ne l'y
 * inscrit pas. Une route d'artisan nouvelle est un evenement bien plus
 * frequent, et c'est elle qu'on protege de l'oubli.
 */
const BACKOFFICE = ['/supervision', '/attestations', '/entreprises']

/**
 * Une entree est courante si elle est la page, ou l'un de ses sous-chemins.
 *
 * La barre oblique compte : `startsWith('/devis')` seul allumerait « Devis »
 * sur une route `/devis-types` qui n'a rien a voir.
 */
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** L'en-tete de l'artisan ne porte pas sa navigation dans le backoffice. */
export function showsNav(pathname: string): boolean {
  return !BACKOFFICE.some((prefix) => isCurrent(pathname, prefix))
}
