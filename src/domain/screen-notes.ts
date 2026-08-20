/**
 * Ce que chaque ecran dit de lui-meme, a la premiere visite.
 *
 * Une donnee pure, et elle vit ici parce que deux fonctionnalites la lisent —
 * l'atelier de l'artisan et l'espace du demandeur : `check:feature-isolation`
 * interdit a l'une d'importer l'autre, et `src/domain` ne touche a aucune
 * donnee.
 *
 * **Le catalogue ne connait pas les ecrans ; les ecrans le connaissent.**
 * Chaque page passe SA cle a la carte. Une table qui, a l'inverse, saurait
 * quelle notice va sur quelle page serait le registre d'etapes que la spec
 * ecarte avec le tutoriel (§2.1).
 *
 * L'accueil n'a pas d'entree : il se presente de lui-meme, et sa mise en route
 * dit deja quoi faire.
 */

/**
 * La cle EST le segment de route de l'ecran presente.
 *
 * Elle se retrouve telle quelle en base (`screen_note_dismissal.note_key`), ce
 * qui la rend verifiable : un test ouvre `src/app/<groupe>/<cle>/page.tsx` et
 * refuse une notice qui presenterait un ecran disparu. Renommer une route
 * rouvrirait la carte une fois chez ceux qui l'avaient fermee — c'est le prix,
 * minime, de n'avoir pas un second jeu de noms a tenir a jour.
 */
export type ScreenNoteKey =
  | 'devis'
  | 'mon-passeport'
  | 'agenda'
  | 'verification'
  | 'mes-logements'
  | 'mon-repertoire'

/** `Entry` parce que la molecule qui rend une notice s'appelle `ScreenNote`. */
export interface ScreenNoteEntry {
  key: ScreenNoteKey
  /**
   * Le public concerne — c'est aussi son groupe de routes.
   *
   * Meme vocabulaire que `registration_intent.kind` : une entreprise ou un
   * demandeur. Le relecteur interne n'a pas de notice, ses ecrans ne
   * s'adressent pas a quelqu'un qui arrive.
   */
  audience: 'company' | 'requester'
  /**
   * Deux phrases au plus : ce que montre l'ecran, et le seul geste qui compte.
   *
   * Mot pour mot la spec A2 §4. Une troisieme phrase et plus personne ne lit.
   */
  text: string
}

export const SCREEN_NOTES: Record<ScreenNoteKey, ScreenNoteEntry> = {
  devis: {
    key: 'devis',
    audience: 'company',
    text: 'La liste de tout ce que vous avez établi. L’accueil, lui, ne montre que ce qui bouge.',
  },
  'mon-passeport': {
    key: 'mon-passeport',
    audience: 'company',
    text: 'Cette page est publique. Vos clients y voient vos assurances vérifiées et vos délais tenus.',
  },
  agenda: {
    key: 'agenda',
    audience: 'company',
    text: 'Vos rendez-vous, et ceux que vous pouvez proposer à vos clients.',
  },
  verification: {
    key: 'verification',
    audience: 'company',
    text: 'Déposez vos attestations : c’est ce qui fait passer votre passeport en vérifié.',
  },
  'mes-logements': {
    key: 'mes-logements',
    audience: 'requester',
    text: 'Tous vos chantiers, toutes entreprises confondues. Vous êtes le seul à les voir réunis.',
  },
  'mon-repertoire': {
    key: 'mon-repertoire',
    audience: 'requester',
    text: 'Les artisans que vous voulez pouvoir rappeler — y compris ceux qu’on ne connaît pas.',
  },
}
