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

export interface NavEntry {
  href: string
  label: string
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
      { href: '/factures', label: 'Factures' },
      { href: '/agenda', label: 'Agenda' },
    ],
  },
  {
    label: 'Mon entreprise',
    entries: [
      { href: '/mon-passeport', label: 'Passeport' },
      { href: '/verification', label: 'Vérification' },
    ],
  },
]

/**
 * Le backoffice partage `AppShell` avec l'artisan, donc son en-tete.
 *
 * La liste est **negative**, et c'est un choix assume : une route de backoffice
 * ajoutee plus tard heriterait de la navigation de l'artisan tant qu'on ne l'y
 * inscrit pas. Une route d'artisan nouvelle est un evenement bien plus
 * frequent, et c'est elle qu'on protege de l'oubli.
 */
const BACKOFFICE = ['/supervision', '/attestations']

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
