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
  /**
   * Une condition qui ne se dit pas en capacite.
   *
   * `capability` couvre « ce que cette personne PEUT faire » ; il ne couvre pas
   * son inverse. « Offre Pro » se montre justement a qui ne l'a PAS — un
   * responsable en gratuit —, et aucune capacite n'exprime « il manque le
   * plan ». Le predicat le fait, sans dupliquer la table des capacites.
   */
  when?: (access: Access | undefined) => boolean
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
      { href: '/', label: 'Accueil' },
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
      // `team.manage` masque « Équipe » a une entreprise gratuite : sans cette
      // entree-la, l'offre Pro n'a plus AUCUN point d'entree dans la navigation.
      // Elle se montre a qui pourrait la prendre — un responsable en gratuit —
      // et disparait des qu'il l'a.
      {
        href: '/offre-pro',
        label: 'Offre Pro',
        when: (access) => access?.role === 'owner' && access?.plan === 'free',
      },
    ],
  },
]

/**
 * Les entrees de l'espace du demandeur.
 *
 * Deux, et un seul groupe : il n'y a pas de frequence d'usage a distinguer
 * entre elles. Le dossier se consulte quand un chantier bouge, le repertoire
 * quand un probleme arrive — les deux sont des destinations de premier rang.
 *
 * Aucune capacite : le demandeur n'en a pas. La table des capacites regit ce
 * qu'une personne peut faire DANS une entreprise, et il n'appartient a aucune.
 *
 * `/verifier` n'y figure pas, bien qu'elle lui serve : c'est une page publique,
 * et la meler aux deux ecrans de son dossier laisserait croire que ce qu'il y
 * cherche est archive chez nous. Le lien vit dans le repertoire, a l'endroit ou
 * la question se pose.
 */
export const spaceNavGroups: NavGroup[] = [
  {
    label: 'Mon dossier',
    entries: [
      { href: '/mes-logements', label: 'Mes logements' },
      { href: '/mon-repertoire', label: 'Mon répertoire' },
    ],
  },
]

/**
 * Les groupes que cette personne-la peut voir.
 *
 * Un groupe dont toutes les entrees tombent disparait : une etiquette de
 * groupe annoncee sur une liste vide est un bruit pour le lecteur d'ecran.
 *
 * `access` est toujours connu : cette navigation ne sert que des ecrans
 * d'artisan, et le backoffice a sa propre coquille depuis `AdminShell`.
 */
export function visibleGroups(access: Access): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      entries: group.entries
        .filter(
          (entry) =>
            (!entry.capability || can(access, entry.capability)) &&
            (!entry.when || entry.when(access)),
        )
        // `when` est une fonction, et ces entrees traversent la frontiere vers
        // `AppNav`, un composant client : une fonction ne s'y serialise pas. Elle
        // n'a servi qu'au filtre ci-dessus, on la retire de ce qui part au client.
        .map(({ when: _when, ...entry }) => entry),
    }))
    .filter((group) => group.entries.length > 0)
}

/**
 * Les entrees du backoffice.
 *
 * Elles n'existaient pas : les trois ecrans internes ne se rejoignaient que par
 * deux liens poses a la main dans l'en-tete de la supervision, et depuis la
 * file des attestations on ne revenait nulle part. Le relecteur passe pourtant
 * sa journee a faire l'aller-retour entre la file et la fiche d'une entreprise.
 *
 * Aucune capacite : `currentStaff` est une garde binaire — on est relecteur ou
 * on ne l'est pas —, et elle ne connait pas les roles de l'artisan.
 *
 * **C'est `AdminShell` qui les passe**, explicitement. Une version anterieure
 * les substituait d'apres l'URL, faute de pouvoir distinguer le backoffice cote
 * serveur : les deux publics partageaient alors `AppShell`. Elle s'appuyait sur
 * une liste de prefixes qu'il fallait tenir a jour, et son propre commentaire
 * reconnaissait qu'une route interne ajoutee plus tard heriterait de la
 * navigation de l'artisan. Deux coquilles separees suppriment la question :
 * l'ecran qui recoit ces entrees est celui qui les demande.
 */
export const staffNavGroups: NavGroup[] = [
  {
    label: 'Backoffice',
    entries: [
      { href: '/supervision', label: 'Supervision' },
      { href: '/attestations', label: 'Attestations' },
      { href: '/entreprises', label: 'Entreprises' },
      { href: '/leads', label: 'Leads' },
    ],
  },
]

/**
 * Une entree est courante si elle est la page, ou l'un de ses sous-chemins.
 *
 * La barre oblique compte : `startsWith('/devis')` seul allumerait « Devis »
 * sur une route `/devis-types` qui n'a rien a voir.
 */
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
