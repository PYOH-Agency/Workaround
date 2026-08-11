import { trackedFiles, read, stripComments, lineAt, report, warn } from './lib/sources.mjs'
import { INVENTORY } from './lib/design-system-inventory.mjs'

const DS_DIR = 'src/ui/'

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

/**
 * 1 ter. Une couleur en dur ne se glisse pas dans une valeur arbitraire.
 *
 * `OFF_TOKEN` ne lit que les ecrans ; les motifs vivent dans le DS, ou
 * `money-flow.tsx` encode ses hachures. Sans ce controle, y remplacer
 * `var(--dq-hatch)` par une couleur litterale passerait inapercu.
 */
const RAW_COLOR = /-\[[^\]]*(?:#[0-9A-Fa-f]{3,8}\b|\brgba?\([^)]*\))[^\]]*\]/g
for (const { file, source } of sources.filter((s) => s.file.startsWith('src/'))) {
  for (const m of source.matchAll(RAW_COLOR)) {
    violations.push(`${file}:${lineAt(source, m.index)} — couleur en dur dans « ${m[0]} »`)
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
