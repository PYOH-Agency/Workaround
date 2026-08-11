/**
 * Source de verite unique des couleurs du produit.
 *
 * Le PDF (@react-pdf/renderer) ne comprend aucune classe CSS : il importe ce
 * fichier directement. `tokens.css` en est la projection pour Tailwind, et
 * `tests/ui/tokens.test.ts` garantit que les deux ne divergent jamais.
 */

/** Rampes primitives. Aucun composant ne doit les utiliser directement. */
export const ramp = {
  /** Neutres chauds. Aucun gris froid dans le produit. */
  chalk: {
    50: '#FDFCF8',
    100: '#F5F1E8',
    200: '#EBE5D9',
    300: '#DCD4C4',
    400: '#C4BBA8',
    450: '#968C7D',
    500: '#8C8375',
    600: '#6B6357',
    700: '#4A4239',
    800: '#2E2822',
    900: '#1C1714',
  },
  /** La marque. Ne porte jamais un statut. */
  terracotta: {
    50: '#FDF2EC',
    100: '#FBE0D2',
    200: '#F5BE9B',
    300: '#F0A87E',
    400: '#E88B52',
    500: '#E2652B',
    600: '#C4501C',
    700: '#9E3E14',
    900: '#5C2409',
  },
  /** Verifie, signe, paye. */
  bronze: {
    50: '#EDF1E4',
    100: '#D9E2C9',
    300: '#9CBB7E',
    400: '#6B8C4F',
    600: '#4F6B3A',
    700: '#3B5229',
    900: '#232B1C',
  },
  /** Echeance proche, a traiter. */
  brass: {
    50: '#FBF3DF',
    100: '#F5E9C9',
    300: '#DDB661',
    500: '#C79A3E',
    600: '#A67D28',
    700: '#7A5C16',
    900: '#2E2611',
  },
  /** Perime, en retard, destructif. */
  brick: {
    50: '#FBEAE8',
    100: '#F5CFCB',
    300: '#EC8B80',
    500: '#C22B22',
    600: '#9B1C1C',
    700: '#8E1B15',
    900: '#2E1614',
  },
} as const

/**
 * Surfaces du mode sombre.
 *
 * Volontairement hors rampe : ce sont trois surfaces et une bordure, pas une
 * echelle de couleur. Les melanger a la rampe `chalk` laisserait croire qu'on
 * peut interpoler entre elles.
 */
export const night = {
  base: '#14110E',
  card: '#1F1A16',
  raised: '#2A2320',
  rule: '#3A322C',
} as const

const white = '#FFFFFF'

/**
 * Roles semantiques. C'est ce que les composants utilisent, jamais les rampes.
 *
 * Les noms sont choisis pour que l'utilitaire Tailwind se lise bien :
 * `bg-surface`, `text-ink-muted`, `border-field`, `outline-ring`.
 */
export const roles = {
  light: {
    surface: ramp.chalk[100],
    card: ramp.chalk[50],
    raised: white,

    ink: ramp.chalk[900],
    'ink-soft': ramp.chalk[700],
    'ink-muted': ramp.chalk[600],

    link: ramp.terracotta[700],
    brand: ramp.terracotta[500],

    rule: ramp.chalk[300],
    field: ramp.chalk[500],
    ring: ramp.terracotta[600],

    primary: ramp.chalk[900],
    'on-primary': ramp.chalk[100],

    conversion: ramp.terracotta[600],
    'on-conversion': white,

    verified: ramp.bronze[700],
    'verified-bg': ramp.bronze[50],
    warning: ramp.brass[700],
    'warning-bg': ramp.brass[50],
    danger: ramp.brick[700],
    'danger-bg': ramp.brick[50],
    'danger-solid': ramp.brick[600],
    'on-danger': white,
  },
  dark: {
    surface: night.base,
    card: night.card,
    raised: night.raised,

    ink: ramp.chalk[100],
    'ink-soft': ramp.chalk[400],
    'ink-muted': ramp.chalk[450],

    // Un lien est du texte pose sur une surface : il doit s'eclaircir.
    link: ramp.terracotta[300],
    // La marque, elle, ne change pas de couleur selon le theme (voir ci-dessous).
    brand: ramp.terracotta[500],

    rule: night.rule,
    field: ramp.chalk[500],
    ring: ramp.terracotta[300],

    primary: ramp.chalk[100],
    'on-primary': night.base,

    conversion: ramp.terracotta[600],
    'on-conversion': white,

    verified: ramp.bronze[300],
    'verified-bg': ramp.bronze[900],
    warning: ramp.brass[300],
    'warning-bg': ramp.brass[900],
    danger: ramp.brick[300],
    'danger-bg': ramp.brick[900],
    'danger-solid': ramp.brick[600],
    'on-danger': white,
  },
} as const

/**
 * Les roles identiques dans les deux themes, et la raison pour laquelle ils le sont.
 *
 * Un jeton qui porte a la fois son fond et son texte est auto-suffisant : il ne
 * repose sur aucune surface, donc il n'a aucune raison de s'inverser. Un bouton
 * destructif est rouge sombre a texte clair, en clair comme en sombre.
 *
 * Cette liste existe parce que l'inverse a produit un vrai defaut : en inversant
 * mecaniquement tous les roles, le bouton de conversion (#F0A87E) et le bouton
 * destructif (#EC8B80) devenaient deux peches indistinguables — precisement la
 * confusion que la regle du bouton primaire cherchait a empecher.
 *
 * `brand` en fait partie : une couleur de marque qui change avec le theme est
 * une marque plus faible.
 */
export const THEME_INDEPENDENT = [
  'brand',
  'field',
  'conversion',
  'on-conversion',
  'danger-solid',
  'on-danger',
] as const satisfies readonly RoleName[]

export type RoleName = keyof typeof roles.light
export type Theme = keyof typeof roles

/**
 * Recouvrement hachure du segment "en retard" de `MoneyFlow` (spec accueil
 * artisan §4 : le retard est hachure ET rouge, la couleur ne porte jamais
 * seule l'information).
 *
 * Hors de `roles` volontairement : il ne s'agit pas d'une couleur opaque mais
 * d'un blanc/noir semi-transparent compose sur `danger`, donc il ne peut ni
 * satisfaire `readBlock` (qui n'extrait que des `#RRGGBB`) ni s'exposer comme
 * couleur Tailwind autonome dans `@theme inline`. `tests/ui/tokens.test.ts`
 * verifie que ces deux chaines restent identiques a `tokens.css`, dans le
 * bloc clair et dans les deux blocs sombres ; `tests/ui/contrast.test.ts`
 * verifie que la rayure composee sur `danger` atteint 3:1 dans chaque theme.
 */
export const hatch = {
  light: 'rgba(255,255,255,.5)',
  dark: 'rgba(20,17,14,.6)',
} as const

/** Rayons. Aucune pilule : c'est le marqueur le plus date du secteur. */
export const radius = {
  badge: '3px',
  control: '6px',
  card: '10px',
  modal: '14px',
} as const

/** Ombres teintees d'encre. Jamais de noir pur, et aucune ombre en mode sombre. */
export const shadow = {
  e1: '0 1px 2px rgba(28,23,20,.06)',
  e2: '0 2px 6px rgba(28,23,20,.09), 0 1px 2px rgba(28,23,20,.05)',
  e3: '0 8px 24px rgba(28,23,20,.11), 0 2px 6px rgba(28,23,20,.06)',
  e4: '0 24px 60px rgba(28,23,20,.19)',
} as const
