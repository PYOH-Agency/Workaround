import { trackedFiles, read, stripComments, lineAt, report, warn } from './lib/sources.mjs'

const DS_DIR = 'src/ui/'

/**
 * L'inventaire du design system, tel que l'arrete la spec « image de marque »
 * (§6.1). Il est **ferme** : pas d'Accordion, pas de Tabs, tant qu'aucun ecran
 * ne les reclame. Un composant absent de cette table est soit mal place, soit
 * une extension que personne n'a decidee.
 *
 * Deux entrees ont ete ajoutees apres l'implementation, parce que l'inventaire
 * avait ete arrete avant elle et que le besoin s'est revele reel :
 *
 * - `ButtonLink` — le HTML distingue agir et naviguer. Imbriquer un `<button>`
 *   dans un `<a>` est invalide et brouille le role annonce.
 * - `QuoteLinesTable` — distinct de `QuoteLineEditor` : l'un lit, l'autre
 *   saisit, et ils n'ont ni les memes contraintes ni les memes balises.
 *
 * Huit entrees supplementaires pour la landing (spec landing §7.1) :
 *
 * - `SectionHeader`, `StepCard` — repetes onze fois sur les deux pages.
 * - `Reveal`, `Stagger` — les deux gestes de marque encapsules. Sans eux,
 *   chaque section reimplemente l'animation et oublie prefers-reduced-motion.
 *   `RevealTick` les accompagne : le carre qui se pose dans un `Reveal`.
 * - `SiretLookup`, `QuoteLinkForm` — les deux actions publiques.
 * - `PrinciplePanel` — les engagements du §12 du socle.
 * - `LandingShell` — navigation a lien croise. `PublicShell` est un gabarit de
 *   document : lui greffer une navigation commerciale le denaturerait.
 *
 * Quatre entrees pour la reprise des treize ecrans (spec « reprise des treize
 * ecrans » §5). Chacune etait DEJA ecrite a la main dans les ecrans : les
 * nommer arrete une derive plutot qu'elle n'ouvre une extension.
 *
 * - `Notice` — l'encart d'alerte, recopie cinq fois avec la meme chaine de
 *   classes et deja deux espacements divergents.
 * - `PageHeader` — le bloc titre, recopie treize fois ; et le retour, qui
 *   vivait en bas de page.
 * - `Rail`, `RailItem` — la suite posee sur un filet, la ou la pile de cartes
 *   ne disait pas qu'un evenement vient apres l'autre.
 * - `DataTable` — le tableau de comparaison. Distinct de `QuoteLinesTable`
 *   comme `QuoteLineEditor` l'est deja de lui : l'un connait les lignes d'un
 *   devis, l'autre ne connait rien de son contenu.
 *
 * N'y figurent PAS, et c'est une decision : `WeekGrid`, `ProgressGauge` et
 * `CopyField` n'ont qu'un seul ecran lecteur et restent aupres de lui, comme
 * `SituationForm` ou `BusyNotice`.
 *
 * Toute autre addition doit passer par la spec avant d'arriver ici.
 */
const INVENTORY = {
  atoms: [
    'Button', 'ButtonLink', 'Input', 'Textarea', 'Select', 'Checkbox', 'Label',
    'HelperText', 'FieldError', 'Badge', 'Icon', 'Spinner', 'Link', 'Heading',
    'Text', 'Money', 'DateText', 'Separator', 'Skeleton',
  ],
  molecules: [
    'Field', 'Card', 'StatusBadge', 'SealBadge', 'LogoLockup', 'EmptyState',
    'Toast', 'Tooltip', 'ButtonGroup', 'SummaryLine', 'Dialog', 'ThemeToggle',
    'SectionHeader', 'StepCard', 'Reveal', 'Stagger', 'RevealTick',
    'Notice', 'PageHeader', 'Rail', 'RailItem',
    // La navigation doit connaitre la page courante, et un composant serveur ne
    // peut pas lire l'URL. L'isoler garde `AppHeader` cote serveur au lieu d'y
    // verser `Lockup` et `Text` pour un seul `usePathname()`. Molecule et non
    // organisme : elle ne compose que des atomes.
    'AppNav',
  ],
  organisms: [
    'AppHeader', 'QuoteTable', 'QuoteLineEditor', 'QuoteLinesTable', 'TotalsPanel',
    'VatBreakdown', 'LegalMentionsPanel', 'PaymentTimeline', 'SignaturePanel',
    'SiretLookup', 'QuoteLinkForm', 'PrinciplePanel', 'DataTable',
    // Ajoute en M6·B : le client et l'entreprise lisent la MEME chronologie.
    // La loger dans l'un des deux ecrans obligerait l'autre a importer une
    // fonctionnalite voisine, ce que l'autonomie des fonctionnalites interdit.
    'ChantierTimeline',
  ],
  shells: ['AppShell', 'PublicShell', 'PdfShell', 'LandingShell', 'SpaceShell'],
  brand: ['Mark', 'Seal', 'Lockup'],
}

/** Les couches qui contiennent des composants ; tokens, cn et fonts n'en sont pas. */
const LAYERS = Object.keys(INVENTORY)

/**
 * Quelle balise HTML chaque composant remplace.
 *
 * Le controle est incremental : une ligne ne s'applique que si le composant
 * existe deja. Le design system se reprend ecran par ecran (spec §7.1), et
 * chaque composant livre verrouille de lui-meme la balise qu'il remplace —
 * sans qu'il faille penser a mettre le controle a jour.
 */
const PRIMITIVES = [
  { component: 'Button', tags: ['button'] },
  { component: 'Input', tags: ['input'] },
  { component: 'Textarea', tags: ['textarea'] },
  { component: 'Select', tags: ['select'] },
  { component: 'Label', tags: ['label'] },
  { component: 'Link', tags: ['a'] },
  { component: 'Text', tags: ['p'] },
  { component: 'Separator', tags: ['hr'] },
  { component: 'Heading', tags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
]

/**
 * Le rendu PDF a ses propres primitives (@react-pdf/renderer), qui ne sont pas
 * des balises HTML. Il consomme les tokens directement (spec §6.2).
 */
const EXEMPT = ['src/pdf/']

const EXPORTED = /export\s+(?:async\s+)?(?:function|const|class)\s+([A-Z]\w*)/g

const sources = trackedFiles(['.ts', '.tsx'])
  .filter((file) => file.startsWith('src/') || file.startsWith('tests/'))
  .map((file) => ({ file, source: stripComments(read(file)) }))

/** La couche d'un fichier du DS : `src/ui/atoms/button.tsx` → `atoms`. */
const layerOf = (file) => file.slice(DS_DIR.length).split('/')[0]

/** Les composants reellement livres, et le fichier qui les definit. */
const components = new Map()
for (const { file, source } of sources) {
  if (!file.startsWith(DS_DIR) || !LAYERS.includes(layerOf(file))) continue
  for (const [, name] of source.matchAll(EXPORTED)) components.set(name, file)
}

const violations = []

// 1. Aucun ecran ne recree a la main ce que le design system fournit deja.
const enforced = PRIMITIVES.filter(({ component }) => components.has(component)).flatMap(
  ({ component, tags }) =>
    // L'analyse porte sur la source entiere, et non ligne a ligne : une balise
    // dont les attributs passent a la ligne suivante n'a rien apres son nom.
    tags.map((tag) => ({ component, tag, pattern: new RegExp(`<${tag}(?=[\\s/>])`, 'g') })),
)

const screens = sources.filter(
  ({ file }) =>
    file.endsWith('.tsx') &&
    file.startsWith('src/') &&
    !file.startsWith(DS_DIR) &&
    !EXEMPT.some((prefix) => file.startsWith(prefix)),
)

/**
 * Un champ cache n'a ni apparence, ni cible tactile, ni etiquette : c'est une
 * valeur transportee par le formulaire, pas un controle. Le faire passer par
 * `Input` lui appliquerait une hauteur de 44 px et une bordure pour rien.
 *
 * La fenetre de lecture est bornee parce que les attributs d'une balise peuvent
 * passer a la ligne.
 */
const isHiddenInput = (source, index) =>
  /type="hidden"/.test(source.slice(index, index + 160))

for (const { file, source } of screens) {
  for (const { component, tag, pattern } of enforced) {
    for (const match of source.matchAll(pattern)) {
      if (tag === 'input' && isHiddenInput(source, match.index)) continue
      violations.push(`${file}:${lineAt(source, match.index)} — <${tag}> : passer par ${component}`)
    }
  }
}

/**
 * 1 bis. Les couleurs viennent des jetons, jamais de la palette Tailwind ni
 * d'une opacite.
 *
 * `text-emerald-600` sur la fiche publique donnait 3,38:1 — sous le 4,5:1 exige
 * — et personne ne pouvait le savoir : un test de contraste ne sait verifier que
 * ce qui est nomme. Meme raison pour `opacity-60` sur du texte, qui baisse le
 * contraste d'une quantite qu'aucun jeton ne connait.
 *
 * `divide-black/10` est du meme ordre : le jeton `rule` existe, et lui suit le
 * theme.
 */
const PALETTE =
  'gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

const OFF_TOKEN = [
  {
    pattern: new RegExp(`\\b(?:text|bg|border|ring|divide|fill|stroke)-(?:${PALETTE})-\\d{2,3}\\b`, 'g'),
    fix: 'passer par un jeton semantique de tokens.ts',
  },
  {
    pattern: /\b(?:text|bg|border|divide)-(?:black|white)\/\d{1,3}\b/g,
    fix: 'passer par un jeton semantique — « rule » pour un filet',
  },
  { pattern: /\bopacity-\d{1,3}\b/g, fix: 'porter le ton par « Text », dont le contraste est calcule' },
]

for (const { file, source } of screens) {
  for (const { pattern, fix } of OFF_TOKEN) {
    for (const match of source.matchAll(pattern)) {
      violations.push(`${file}:${lineAt(source, match.index)} — « ${match[0]} » : ${fix}`)
    }
  }
}

// 2. Un composant pose a la racine de src/ui echapperait a tout : la racine ne
//    porte que tokens, cn et fonts, qui ne contiennent aucun JSX (spec §6.1).
for (const { file } of sources) {
  if (file.startsWith(DS_DIR) && file.endsWith('.tsx') && !LAYERS.includes(layerOf(file))) {
    violations.push(`${file} — a la racine de ${DS_DIR} : ranger dans ${LAYERS.join(', ')}`)
  }
}

// 3. L'inventaire est ferme, et chaque composant appartient a une couche.
for (const [name, origin] of components) {
  const layer = layerOf(origin)
  if (INVENTORY[layer].includes(name)) continue

  const declared = LAYERS.find((candidate) => INVENTORY[candidate].includes(name))
  violations.push(
    declared
      ? `${origin} — ${name} appartient a la couche « ${declared} », pas a « ${layer} »`
      : `${origin} — ${name} ne figure pas dans l'inventaire de la spec (§6.1)`,
  )
}

// Un composant que personne n'utilise finit par mentir sur ce que fait le
// produit — mais la reprise se fait par rangs (spec §7.1), et un rang livre les
// atomes avant les ecrans qui les consomment. On le signale, on ne bloque pas.
const unused = [...components]
  .filter(([name, origin]) => !sources.some(({ file, source }) => file !== origin && new RegExp(`\\b${name}\\b`).test(source)))
  .map(([name, origin]) => `${origin} — ${name} n'est encore utilise nulle part`)

warn('Composants du design system livrés mais pas encore consommés', unused)

process.exit(report('Usage du design system', violations))
