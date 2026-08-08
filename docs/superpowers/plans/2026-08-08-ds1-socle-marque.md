# DS1 — Le socle de marque · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les tokens, les polices, les fichiers de marque et les atomes du design system D'équerre, avec deux tests qui empêchent toute dérive future.

**Architecture :** `src/ui/tokens.ts` est la source de vérité unique. `tokens.css` en est la projection pour Tailwind v4 via `@theme inline`, le PDF importera plus tard le TS directement. Deux tests garantissent la parité TS↔CSS et le respect des seuils WCAG. Les composants sont serveur par défaut et n'exposent que des variantes, jamais de `className` libre.

**Tech Stack :** Next.js 16.3 (App Router), React 19.2, Tailwind CSS v4 via `@tailwindcss/postcss`, `next/font/google`, Vitest 4 (environnement `node`), Playwright.

**Périmètre :** rangs 0 et 1 de la spec. La reprise des écrans (rangs 2 à 8) fait l'objet du plan DS2.

**Référence :** [Spec image de marque](../specs/2026-08-08-image-de-marque-design.md)

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/ui/tokens.ts` | Rampes primitives + rôles sémantiques clair/sombre. Aucun JSX. Source de vérité. |
| `src/ui/tokens.css` | Variables CSS par thème + `@theme inline` qui expose les utilitaires Tailwind. |
| `src/ui/fonts.ts` | Archivo et Inter via `next/font/google`, auto-hébergées. |
| `src/ui/cn.ts` | Concaténation conditionnelle de classes. Douze lignes, aucune dépendance. |
| `src/ui/brand/mark.tsx` | La marque bicolore. |
| `src/ui/brand/seal.tsx` | Le sceau médaillon. |
| `src/ui/brand/lockup.tsx` | Marque + logotype, trois orientations. |
| `src/ui/atoms/*.tsx` | Un atome par fichier. |
| `src/ui/molecules/field.tsx` | Câble l'accessibilité des champs. |
| `src/ui/molecules/card.tsx` | Surface élevée. |
| `src/ui/theme-script.tsx` | Script inline anti-flash pour `data-theme`. |
| `tests/ui/contrast.test.ts` | Chaque couple de rôles ≥ son seuil WCAG. |
| `tests/ui/tokens.test.ts` | Parité `tokens.ts` ↔ `tokens.css`. |

Les tests unitaires tournent en environnement `node` : ils ne rendent aucun composant. Le comportement des composants reste couvert par les tests Playwright existants (`tests/e2e`), ce qui évite d'ajouter `jsdom` au projet.

---

## Task 1 : Les rampes et les rôles

**Files:**
- Create: `src/ui/tokens.ts`

- [ ] **Step 1 : Écrire les primitives et les rôles**

```ts
// src/ui/tokens.ts

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

/** Surfaces du mode sombre. Volontairement hors rampe : ce sont des surfaces, pas une echelle. */
export const night = {
  base: '#14110E',
  card: '#1F1A16',
  raised: '#2A2320',
  rule: '#3A322C',
} as const

const white = '#FFFFFF'

/**
 * Roles semantiques. C'est ce que les composants utilisent, jamais les rampes.
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

    link: ramp.terracotta[300],
    brand: ramp.terracotta[300],

    rule: night.rule,
    field: ramp.chalk[500],
    ring: ramp.terracotta[300],

    primary: ramp.chalk[100],
    'on-primary': night.base,

    conversion: ramp.terracotta[300],
    'on-conversion': night.base,

    verified: ramp.bronze[300],
    'verified-bg': ramp.bronze[900],
    warning: ramp.brass[300],
    'warning-bg': ramp.brass[900],
    danger: ramp.brick[300],
    'danger-bg': ramp.brick[900],
    'danger-solid': ramp.brick[300],
    'on-danger': night.base,
  },
} as const

export type RoleName = keyof typeof roles.light
export type Theme = keyof typeof roles

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
```

- [ ] **Step 2 : Vérifier que TypeScript compile**

Run : `pnpm exec tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/ui/tokens.ts
git commit -m "feat: tokens de couleur, rayons et ombres de la marque"
```

---

## Task 2 : Le test de contraste

C'est le test le plus important du design system : il transforme l'accessibilité d'intention en contrainte.

**Files:**
- Create: `tests/ui/contrast.test.ts`
- Modify: `package.json` — ajouter `tests/ui` à `test:unit`

- [ ] **Step 1 : Écrire le test**

```ts
// tests/ui/contrast.test.ts
import { describe, expect, it } from 'vitest'
import { roles, type RoleName, type Theme } from '@/ui/tokens'

/** Luminance relative WCAG 2.1. */
function luminance(hex: string): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const h = hex.replace('#', '')
  const r = channel(parseInt(h.slice(0, 2), 16))
  const g = channel(parseInt(h.slice(2, 4), 16))
  const b = channel(parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** 4.5 pour du texte, 3 pour un composant d'interface ou du texte large. */
type Check = { fg: RoleName; bg: RoleName; min: 4.5 | 3 }

/**
 * Un separateur (`rule`) est purement decoratif : WCAG ne lui impose aucun
 * seuil, et il ne porte jamais seul une information de structure. Il est donc
 * volontairement absent de cette liste.
 */
const CHECKS: Check[] = [
  // Texte sur les trois surfaces
  { fg: 'ink', bg: 'surface', min: 4.5 },
  { fg: 'ink', bg: 'card', min: 4.5 },
  { fg: 'ink', bg: 'raised', min: 4.5 },
  { fg: 'ink-soft', bg: 'surface', min: 4.5 },
  { fg: 'ink-soft', bg: 'card', min: 4.5 },
  { fg: 'ink-soft', bg: 'raised', min: 4.5 },
  { fg: 'ink-muted', bg: 'surface', min: 4.5 },
  { fg: 'ink-muted', bg: 'card', min: 4.5 },
  { fg: 'ink-muted', bg: 'raised', min: 4.5 },
  // Un lien est du texte
  { fg: 'link', bg: 'surface', min: 4.5 },
  { fg: 'link', bg: 'card', min: 4.5 },
  { fg: 'link', bg: 'raised', min: 4.5 },
  // Composants d'interface
  { fg: 'field', bg: 'surface', min: 3 },
  { fg: 'field', bg: 'card', min: 3 },
  { fg: 'field', bg: 'raised', min: 3 },
  { fg: 'ring', bg: 'surface', min: 3 },
  { fg: 'ring', bg: 'card', min: 3 },
  { fg: 'ring', bg: 'raised', min: 3 },
  { fg: 'brand', bg: 'surface', min: 3 },
  // Boutons : l'etiquette sur son fond
  { fg: 'on-primary', bg: 'primary', min: 4.5 },
  { fg: 'on-conversion', bg: 'conversion', min: 4.5 },
  { fg: 'on-danger', bg: 'danger-solid', min: 4.5 },
  // Statuts : le texte sur son fond teinte
  { fg: 'verified', bg: 'verified-bg', min: 4.5 },
  { fg: 'warning', bg: 'warning-bg', min: 4.5 },
  { fg: 'danger', bg: 'danger-bg', min: 4.5 },
  // Statuts : le texte directement sur la carte
  { fg: 'verified', bg: 'card', min: 4.5 },
  { fg: 'warning', bg: 'card', min: 4.5 },
  { fg: 'danger', bg: 'card', min: 4.5 },
]

const THEMES: Theme[] = ['light', 'dark']

describe('contraste des roles semantiques', () => {
  for (const theme of THEMES) {
    for (const { fg, bg, min } of CHECKS) {
      it(`${theme} : ${fg} sur ${bg} >= ${min}:1`, () => {
        const palette = roles[theme]
        const value = contrast(palette[fg], palette[bg])
        expect(
          value,
          `${palette[fg]} sur ${palette[bg]} = ${value.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(min)
      })
    }
  }

  it('couvre les deux themes avec les memes couples', () => {
    expect(Object.keys(roles.light).sort()).toEqual(Object.keys(roles.dark).sort())
  })
})
```

- [ ] **Step 2 : Ajouter `tests/ui` au script de test unitaire**

Dans `package.json`, remplacer :

```json
"test:unit": "vitest run tests/domain tests/lib",
```

par :

```json
"test:unit": "vitest run tests/domain tests/lib tests/ui",
```

- [ ] **Step 3 : Lancer le test**

Run : `pnpm test:unit`
Expected : tous les cas passent. **Si un cas échoue, corriger le token dans `tokens.ts`, pas le seuil dans le test.** Le message d'erreur donne les deux hexadécimaux et le ratio obtenu.

- [ ] **Step 4 : Commit**

```bash
git add tests/ui/contrast.test.ts package.json
git commit -m "test: les contrastes des roles semantiques sont verifies en CI"
```

---

## Task 3 : La projection CSS et son test de parité

**Files:**
- Create: `src/ui/tokens.css`
- Create: `tests/ui/tokens.test.ts`

- [ ] **Step 1 : Écrire `tokens.css`**

Les variables brutes sont préfixées `--dq-*`, et `@theme inline` les expose sous des noms de couleurs Tailwind. Le préfixe évite la référence circulaire qu'on obtiendrait avec `--color-surface: var(--color-surface)`, et `inline` fait émettre aux utilitaires un `var()` plutôt qu'une valeur résolue — c'est ce qui rend la bascule de thème instantanée sans dupliquer les utilitaires.

```css
/* src/ui/tokens.css */

:root {
  --dq-surface: #F5F1E8;
  --dq-card: #FDFCF8;
  --dq-raised: #FFFFFF;
  --dq-ink: #1C1714;
  --dq-ink-soft: #4A4239;
  --dq-ink-muted: #6B6357;
  --dq-link: #9E3E14;
  --dq-brand: #E2652B;
  --dq-rule: #DCD4C4;
  --dq-field: #8C8375;
  --dq-ring: #C4501C;
  --dq-primary: #1C1714;
  --dq-on-primary: #F5F1E8;
  --dq-conversion: #C4501C;
  --dq-on-conversion: #FFFFFF;
  --dq-verified: #3B5229;
  --dq-verified-bg: #EDF1E4;
  --dq-warning: #7A5C16;
  --dq-warning-bg: #FBF3DF;
  --dq-danger: #8E1B15;
  --dq-danger-bg: #FBEAE8;
  --dq-danger-solid: #9B1C1C;
  --dq-on-danger: #FFFFFF;
}

@mixin-placeholder-dark {
  /* Bloc factice jamais emis : voir la regle @media et [data-theme] ci-dessous. */
}

:root[data-theme='dark'] {
  --dq-surface: #14110E;
  --dq-card: #1F1A16;
  --dq-raised: #2A2320;
  --dq-ink: #F5F1E8;
  --dq-ink-soft: #C4BBA8;
  --dq-ink-muted: #968C7D;
  --dq-link: #F0A87E;
  --dq-brand: #F0A87E;
  --dq-rule: #3A322C;
  --dq-field: #8C8375;
  --dq-ring: #F0A87E;
  --dq-primary: #F5F1E8;
  --dq-on-primary: #14110E;
  --dq-conversion: #F0A87E;
  --dq-on-conversion: #14110E;
  --dq-verified: #9CBB7E;
  --dq-verified-bg: #232B1C;
  --dq-warning: #DDB661;
  --dq-warning-bg: #2E2611;
  --dq-danger: #EC8B80;
  --dq-danger-bg: #2E1614;
  --dq-danger-solid: #EC8B80;
  --dq-on-danger: #14110E;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --dq-surface: #14110E;
    --dq-card: #1F1A16;
    --dq-raised: #2A2320;
    --dq-ink: #F5F1E8;
    --dq-ink-soft: #C4BBA8;
    --dq-ink-muted: #968C7D;
    --dq-link: #F0A87E;
    --dq-brand: #F0A87E;
    --dq-rule: #3A322C;
    --dq-field: #8C8375;
    --dq-ring: #F0A87E;
    --dq-primary: #F5F1E8;
    --dq-on-primary: #14110E;
    --dq-conversion: #F0A87E;
    --dq-on-conversion: #14110E;
    --dq-verified: #9CBB7E;
    --dq-verified-bg: #232B1C;
    --dq-warning: #DDB661;
    --dq-warning-bg: #2E2611;
    --dq-danger: #EC8B80;
    --dq-danger-bg: #2E1614;
    --dq-danger-solid: #EC8B80;
    --dq-on-danger: #14110E;
  }
}

@theme inline {
  --color-surface: var(--dq-surface);
  --color-card: var(--dq-card);
  --color-raised: var(--dq-raised);
  --color-ink: var(--dq-ink);
  --color-ink-soft: var(--dq-ink-soft);
  --color-ink-muted: var(--dq-ink-muted);
  --color-link: var(--dq-link);
  --color-brand: var(--dq-brand);
  --color-rule: var(--dq-rule);
  --color-field: var(--dq-field);
  --color-ring: var(--dq-ring);
  --color-primary: var(--dq-primary);
  --color-on-primary: var(--dq-on-primary);
  --color-conversion: var(--dq-conversion);
  --color-on-conversion: var(--dq-on-conversion);
  --color-verified: var(--dq-verified);
  --color-verified-bg: var(--dq-verified-bg);
  --color-warning: var(--dq-warning);
  --color-warning-bg: var(--dq-warning-bg);
  --color-danger: var(--dq-danger);
  --color-danger-bg: var(--dq-danger-bg);
  --color-danger-solid: var(--dq-danger-solid);
  --color-on-danger: var(--dq-on-danger);

  --font-display: var(--font-archivo);
  --font-sans: var(--font-inter);

  --radius-badge: 3px;
  --radius-control: 6px;
  --radius-card: 10px;
  --radius-modal: 14px;

  --shadow-e1: 0 1px 2px rgba(28, 23, 20, 0.06);
  --shadow-e2: 0 2px 6px rgba(28, 23, 20, 0.09), 0 1px 2px rgba(28, 23, 20, 0.05);
  --shadow-e3: 0 8px 24px rgba(28, 23, 20, 0.11), 0 2px 6px rgba(28, 23, 20, 0.06);
  --shadow-e4: 0 24px 60px rgba(28, 23, 20, 0.19);
}
```

**Retirer le bloc `@mixin-placeholder-dark` avant de committer** : il n'est présent ci-dessus que pour signaler l'endroit où la duplication clair/sombre est assumée. La duplication entre `[data-theme='dark']` et la requête `prefers-color-scheme` est volontaire et le test de la Step 3 la vérifie ; une variable intermédiaire supplémentaire coûterait plus en lisibilité qu'elle ne rapporte.

L'échelle d'espacement de Tailwind v4 est déjà en base `0.25rem`, soit 4 px : aucun token d'espacement à déclarer.

- [ ] **Step 2 : Écrire le test de parité**

```ts
// tests/ui/tokens.test.ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { roles, type Theme } from '@/ui/tokens'

const css = readFileSync(
  fileURLToPath(new URL('../../src/ui/tokens.css', import.meta.url)),
  'utf8',
)

/** Extrait les paires `--dq-nom: #HEX` d'un bloc CSS delimite par des accolades. */
function readBlock(selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  expect(start, `bloc "${selector}" absent de tokens.css`).toBeGreaterThan(-1)
  const open = css.indexOf('{', start)
  let depth = 0
  let end = open
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  const body = css.slice(open, end)
  const out: Record<string, string> = {}
  for (const [, name, value] of body.matchAll(/--dq-([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)) {
    out[name] = value.toUpperCase()
  }
  return out
}

const BLOCKS: Record<Theme, string[]> = {
  light: [':root {'],
  dark: [":root[data-theme='dark']", '@media (prefers-color-scheme: dark)'],
}

describe('parite tokens.ts <-> tokens.css', () => {
  for (const theme of Object.keys(roles) as Theme[]) {
    for (const selector of BLOCKS[theme]) {
      it(`${theme} — ${selector} declare exactement les memes valeurs`, () => {
        const declared = readBlock(selector)
        const expected = Object.fromEntries(
          Object.entries(roles[theme]).map(([k, v]) => [k, v.toUpperCase()]),
        )
        expect(declared).toEqual(expected)
      })
    }
  }

  it('chaque role est expose comme couleur Tailwind', () => {
    for (const name of Object.keys(roles.light)) {
      expect(css).toContain(`--color-${name}: var(--dq-${name});`)
    }
  })
})
```

- [ ] **Step 3 : Lancer les tests**

Run : `pnpm test:unit`
Expected : les tests de parité et de contraste passent. Une divergence affiche le diff exact des couleurs.

- [ ] **Step 4 : Commit**

```bash
git add src/ui/tokens.css tests/ui/tokens.test.ts
git commit -m "feat: projection CSS des tokens, avec test de parite"
```

---

## Task 4 : Les polices et l'utilitaire de classes

**Files:**
- Create: `src/ui/fonts.ts`
- Create: `src/ui/cn.ts`

- [ ] **Step 1 : Écrire `fonts.ts`**

```ts
// src/ui/fonts.ts
import { Archivo, Inter } from 'next/font/google'

/** Titrage. Industriel, large, solide. */
export const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  display: 'swap',
})

/** Corps et donnees. Neutre, lisible en tableau. */
export const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})
```

`next/font/google` télécharge et sert les polices depuis notre domaine : aucune requête vers Google au chargement, ce qui sert aussi le cadrage RGPD.

- [ ] **Step 2 : Écrire `cn.ts`**

```ts
// src/ui/cn.ts

/**
 * Concatenation conditionnelle de classes.
 *
 * Volontairement plus pauvre que `clsx` : les composants du design system
 * n'acceptent pas de `className` arbitraire sur leur ossature, donc il n'y a
 * jamais de conflit d'utilitaires a resoudre et `tailwind-merge` est inutile.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
```

- [ ] **Step 3 : Vérifier la compilation**

Run : `pnpm exec tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/ui/fonts.ts src/ui/cn.ts
git commit -m "feat: polices Archivo et Inter auto-hebergees, et utilitaire de classes"
```

---

## Task 5 : Les fichiers de marque

**Files:**
- Create: `src/ui/brand/mark.tsx`
- Create: `src/ui/brand/seal.tsx`
- Create: `src/ui/brand/lockup.tsx`
- Create: `public/brand/mark.svg`
- Create: `public/brand/seal.svg`
- Create: `src/app/icon.svg`
- Delete: `src/app/favicon.ico`

- [ ] **Step 1 : La marque bicolore**

```tsx
// src/ui/brand/mark.tsx

/**
 * La marque : une equerre de macon. Le bras vertical en encre, la lame en
 * terre cuite, et le carre de l'angle interieur — signe conventionnel de
 * l'angle droit verifie.
 *
 * Sous 24 px le carre disparait : il se refermerait en tache.
 * En une seule encre (`tone="mono"`), les deux bras se rejoignent.
 */
export function Mark({
  size = 32,
  tone = 'brand',
}: {
  size?: number
  tone?: 'brand' | 'mono' | 'inverse'
}) {
  const arm = tone === 'brand' ? 'var(--dq-ink)' : 'currentColor'
  const blade = tone === 'brand' ? 'var(--dq-brand)' : 'currentColor'
  const showAngle = size >= 24

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 4 H19 V29 H8 Z" fill={arm} />
      <path d="M8 29 H44 V40 H8 Z" fill={blade} />
      {showAngle ? <rect x="19" y="22" width="7" height="7" fill={arm} /> : null}
    </svg>
  )
}
```

`tone="inverse"` et `tone="mono"` reposent tous deux sur `currentColor` : c'est le parent qui décide de l'encre, ce qui rend le sceau utilisable dans un PDF comme sur un fond sombre sans variante supplémentaire.

- [ ] **Step 2 : Le sceau**

```tsx
// src/ui/brand/seal.tsx

/**
 * Le sceau : l'equerre en reserve dans un medaillon.
 *
 * Il s'appose, il ne s'exprime pas — favicon, icone d'application, sceau de
 * verification, tampon. Toujours seul, jamais accompagne du logotype.
 */
export function Seal({
  size = 32,
  tone = 'brand',
}: {
  size?: number
  tone?: 'brand' | 'mono'
}) {
  const medallion = tone === 'brand' ? 'var(--dq-ink)' : 'currentColor'
  const reserve = tone === 'brand' ? 'var(--dq-card)' : 'var(--dq-raised)'
  const showAngle = size >= 24

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="48" rx="11" fill={medallion} />
      <path d="M13 10 H21 V28 H38 V36 H13 Z" fill={reserve} />
      {showAngle ? <rect x="21" y="21" width="7" height="7" fill="var(--dq-brand)" /> : null}
    </svg>
  )
}
```

- [ ] **Step 3 : Le verrouillage**

```tsx
// src/ui/brand/lockup.tsx
import { cn } from '@/ui/cn'
import { Mark } from './mark'

/**
 * Marque + logotype. Le logotype est du texte, pas une image : il herite de
 * la couleur, il se selectionne, et il reste lisible pour un lecteur d'ecran.
 */
export function Lockup({
  size = 'md',
  orientation = 'horizontal',
}: {
  size?: 'sm' | 'md' | 'lg'
  orientation?: 'horizontal' | 'vertical'
}) {
  const markSize = { sm: 24, md: 32, lg: 46 }[size]
  const textSize = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }[size]

  return (
    <span
      className={cn(
        'inline-flex items-center text-ink',
        orientation === 'horizontal' ? 'flex-row gap-3' : 'flex-col gap-2',
      )}
    >
      <Mark size={markSize} />
      <span
        className={cn('font-display font-extrabold tracking-[-0.035em]', textSize)}
      >
        d’équerre
      </span>
    </span>
  )
}
```

L'apostrophe est bien `’` (U+2019), jamais `'`.

- [ ] **Step 4 : Les fichiers statiques**

`public/brand/mark.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <path d="M8 4 H19 V29 H8 Z" fill="#1C1714"/>
  <path d="M8 29 H44 V40 H8 Z" fill="#E2652B"/>
  <rect x="19" y="22" width="7" height="7" fill="#1C1714"/>
</svg>
```

`public/brand/seal.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect width="48" height="48" rx="11" fill="#1C1714"/>
  <path d="M13 10 H21 V28 H38 V36 H13 Z" fill="#F5F1E8"/>
  <rect x="21" y="21" width="7" height="7" fill="#E2652B"/>
</svg>
```

`src/app/icon.svg` — le favicon, donc le sceau sans le carré d'angle, qui se refermerait à 16 px :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect width="48" height="48" rx="11" fill="#1C1714"/>
  <path d="M13 10 H21 V28 H38 V36 H13 Z" fill="#F5F1E8"/>
</svg>
```

Puis supprimer l'ancien favicon :

```bash
git rm src/app/favicon.ico
```

Next.js détecte `src/app/icon.svg` par convention de fichier et génère la balise `<link rel="icon">` : aucune déclaration à ajouter dans le layout.

- [ ] **Step 5 : Vérifier la compilation**

Run : `pnpm exec tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/ui/brand public/brand src/app/icon.svg
git commit -m "feat: marque, sceau et verrouillage de D'equerre"
```

---

## Task 6 : Le thème et le layout racine

**Files:**
- Create: `src/ui/theme-script.tsx`
- Modify: `src/app/globals.css` (remplacement complet)
- Modify: `src/app/layout.tsx` (remplacement complet)

- [ ] **Step 1 : Le script anti-flash**

```tsx
// src/ui/theme-script.tsx

/**
 * Pose `data-theme` avant le premier rendu.
 *
 * Sans ca, un utilisateur ayant choisi le mode clair sur un systeme en mode
 * sombre verrait un eclair sombre a chaque navigation. Le script est
 * volontairement minuscule et synchrone : c'est le seul cas ou bloquer le
 * rendu est le bon choix.
 */
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem('dq-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
```

- [ ] **Step 2 : Remplacer `globals.css`**

```css
@import 'tailwindcss';
@import '../ui/tokens.css';

@layer base {
  html {
    color-scheme: light dark;
  }

  body {
    background-color: var(--dq-surface);
    color: var(--dq-ink);
    font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /*
   * Chiffres tabulaires par defaut sur tout le produit.
   *
   * Sur un logiciel de facturation, des colonnes de montants qui ne s'alignent
   * pas font un produit qui a l'air faux. Le choix est donc l'inverse de
   * l'usage courant : on l'active partout et on ne le desactive jamais.
   */
  body {
    font-variant-numeric: tabular-nums;
  }

  :focus-visible {
    outline: 2px solid var(--dq-ring);
    outline-offset: 2px;
  }
}
```

Les variables `--background` et `--foreground` héritées de `create-next-app`, ainsi que la déclaration `font-family: Arial, Helvetica` et la référence à `--font-geist-sans`, disparaissent entièrement.

- [ ] **Step 3 : Remplacer `layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { archivo, inter } from '@/ui/fonts'
import { ThemeScript } from '@/ui/theme-script'
import './globals.css'

export const metadata: Metadata = {
  title: "D'équerre — devis, factures et vérification pour le bâtiment",
  description:
    'Faites vos devis et vos factures, faites-les signer, et montrez que votre assurance est à jour.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-ink">{children}</body>
    </html>
  )
}
```

Deux corrections au passage : `lang` passe de `en` à `fr` — c'est un défaut d'accessibilité réel, un lecteur d'écran prononçait le français avec une voix anglaise — et le titre cesse d'être « Create Next App ». `suppressHydrationWarning` est nécessaire parce que le script modifie `data-theme` avant l'hydratation.

- [ ] **Step 4 : Vérifier que le build passe**

Run : `pnpm build`
Expected : compilation réussie. La page d'accueil référence encore `next.svg` et `vercel.svg` : c'est normal, elle est reprise au rang 7 (plan DS2).

- [ ] **Step 5 : Commit**

```bash
git add src/ui/theme-script.tsx src/app/globals.css src/app/layout.tsx
git commit -m "feat: layout racine sur les tokens, en francais, avec theme sans eclair"
```

---

## Task 7 : Les atomes de texte et de données

**Files:**
- Create: `src/ui/atoms/heading.tsx`
- Create: `src/ui/atoms/text.tsx`
- Create: `src/ui/atoms/money.tsx`
- Create: `src/ui/atoms/date-text.tsx`
- Create: `src/ui/atoms/separator.tsx`

- [ ] **Step 1 : `heading.tsx`**

```tsx
// src/ui/atoms/heading.tsx
import { cn } from '@/ui/cn'

const LEVELS = {
  display: 'font-display font-extrabold text-[2.5rem] leading-[2.75rem] tracking-[-0.03em]',
  1: 'font-display font-extrabold text-[2rem] leading-[2.375rem] tracking-[-0.025em]',
  2: 'font-display font-bold text-2xl leading-[1.875rem] tracking-[-0.02em]',
  3: 'font-display font-bold text-[1.1875rem] leading-[1.625rem] tracking-[-0.015em]',
} as const

export function Heading({
  level,
  as,
  children,
}: {
  level: keyof typeof LEVELS
  as?: 'h1' | 'h2' | 'h3' | 'h4'
  children: React.ReactNode
}) {
  const Tag = as ?? (level === 'display' ? 'h1' : (`h${level}` as 'h1' | 'h2' | 'h3'))
  return <Tag className={cn('text-ink', LEVELS[level])}>{children}</Tag>
}
```

`level` porte l'apparence, `as` porte la sémantique : c'est ce qui permet un `h2` d'apparence `display` sans casser la hiérarchie des titres.

- [ ] **Step 2 : `text.tsx`**

```tsx
// src/ui/atoms/text.tsx
import { cn } from '@/ui/cn'

const SIZES = {
  md: 'text-base leading-[1.625]',
  sm: 'text-sm leading-[1.5]',
  label: 'text-[0.6875rem] leading-[0.875rem] font-semibold uppercase tracking-[0.08em]',
} as const

const TONES = {
  default: 'text-ink',
  soft: 'text-ink-soft',
  muted: 'text-ink-muted',
} as const

export function Text({
  size = 'md',
  tone = 'default',
  as: Tag = 'p',
  children,
}: {
  size?: keyof typeof SIZES
  tone?: keyof typeof TONES
  as?: 'p' | 'span' | 'div' | 'dt' | 'dd'
  children: React.ReactNode
}) {
  return <Tag className={cn(SIZES[size], TONES[tone])}>{children}</Tag>
}
```

- [ ] **Step 3 : `money.tsx`**

```tsx
// src/ui/atoms/money.tsx
import { format } from '@/domain/money'
import { cn } from '@/ui/cn'

/**
 * Un montant. Toujours en chiffres tabulaires et insecable, pour qu'un montant
 * ne se coupe jamais entre le nombre et sa devise en fin de ligne.
 *
 * `cents` est un entier : le domaine ne manipule jamais de flottant.
 */
export function Money({
  cents,
  emphasis = 'normal',
}: {
  cents: number
  emphasis?: 'normal' | 'strong'
}) {
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums',
        emphasis === 'strong' ? 'font-display font-bold text-ink' : 'text-ink',
      )}
    >
      {format(cents)}
    </span>
  )
}
```

Vérifier la signature réelle de `format` dans `src/domain/money.ts` avant d'écrire ce fichier, et l'adapter si elle diffère de `format(cents: number): string`.

- [ ] **Step 4 : `date-text.tsx`**

```tsx
// src/ui/atoms/date-text.tsx

const LONG = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const SHORT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/**
 * Une date. `<time>` porte la valeur lisible par une machine, le texte porte
 * la version francaise. Le format court est en chiffres tabulaires pour
 * s'aligner en colonne de tableau.
 */
export function DateText({
  value,
  format = 'long',
}: {
  value: Date | string
  format?: 'long' | 'short'
}) {
  const date = typeof value === 'string' ? new Date(value) : value
  const iso = date.toISOString().slice(0, 10)
  return (
    <time dateTime={iso} className={format === 'short' ? 'tabular-nums' : undefined}>
      {format === 'long' ? LONG.format(date) : SHORT.format(date)}
    </time>
  )
}
```

- [ ] **Step 5 : `separator.tsx`**

```tsx
// src/ui/atoms/separator.tsx

/**
 * Un separateur purement decoratif — d'ou `aria-hidden`.
 *
 * Son contraste est volontairement faible et WCAG ne lui impose aucun seuil :
 * il ne doit donc JAMAIS porter seul une information de structure. Si une
 * frontiere doit etre percue, c'est a un titre ou a une carte de la porter.
 */
export function Separator() {
  return <hr aria-hidden="true" className="border-0 border-t border-rule" />
}
```

- [ ] **Step 6 : Vérifier la compilation**

Run : `pnpm exec tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 7 : Commit**

```bash
git add src/ui/atoms
git commit -m "feat: atomes de texte, de montant et de date"
```

---

## Task 8 : Les atomes interactifs

**Files:**
- Create: `src/ui/atoms/button.tsx`
- Create: `src/ui/atoms/link.tsx`
- Create: `src/ui/atoms/spinner.tsx`
- Create: `src/ui/atoms/badge.tsx`

- [ ] **Step 1 : `spinner.tsx`**

```tsx
// src/ui/atoms/spinner.tsx

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin motion-reduce:animate-none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity=".25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
```

`motion-reduce:animate-none` respecte `prefers-reduced-motion`. Le spinner reste visible, simplement immobile.

- [ ] **Step 2 : `button.tsx`**

```tsx
// src/ui/atoms/button.tsx
import { cn } from '@/ui/cn'
import { Spinner } from './spinner'

/**
 * Composant serveur : un bouton qui soumet un formulaire ou declenche une
 * server action n'a besoin d'aucun JavaScript client. Ajouter 'use client'
 * ici ferait basculer toutes les pages qui l'utilisent.
 */

const TONES = {
  /**
   * L'encre, pas la terre cuite. Sur un ecran de facturation une action
   * destructive est toujours a portee : un primaire orange et un danger rouge
   * cote a cote, c'est une erreur de clic qui coute une facture.
   */
  primary: 'bg-primary text-on-primary hover:opacity-90',
  /** La seule place de la terre cuite en fond : une page publique, une seule action. */
  conversion: 'bg-conversion text-on-conversion hover:opacity-90 font-semibold',
  secondary: 'border border-field text-ink hover:bg-rule/40',
  ghost: 'text-ink hover:bg-rule/40',
  danger: 'text-danger hover:bg-danger-bg',
  'danger-solid': 'bg-danger-solid text-on-danger hover:opacity-90',
} as const

const SIZES = {
  /** min-h-11 = 44 px : la cible tactile minimale, quelle que soit la taille du texte. */
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
} as const

export function Button({
  tone = 'primary',
  size = 'md',
  type = 'button',
  pending = false,
  disabled = false,
  name,
  value,
  children,
}: {
  tone?: keyof typeof TONES
  size?: keyof typeof SIZES
  type?: 'button' | 'submit' | 'reset'
  pending?: boolean
  disabled?: boolean
  name?: string
  value?: string
  children: React.ReactNode
}) {
  return (
    <button
      type={type}
      name={name}
      value={value}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control',
        'font-medium transition-opacity',
        'disabled:opacity-45 disabled:pointer-events-none',
        TONES[tone],
        SIZES[size],
      )}
    >
      {pending ? <Spinner /> : null}
      {children}
    </button>
  )
}
```

`aria-busy` annonce l'attente à un lecteur d'écran, et `disabled` pendant l'attente empêche la double soumission — le défaut le plus courant sur une émission de facture.

- [ ] **Step 3 : `link.tsx`**

```tsx
// src/ui/atoms/link.tsx
import NextLink from 'next/link'
import { cn } from '@/ui/cn'

const TONES = {
  /** Souligne par defaut : la couleur ne porte jamais seule l'information « ceci est un lien ». */
  default: 'text-link underline underline-offset-2 hover:no-underline',
  /** Pour un lien qui enveloppe une carte entiere, ou le soulignement nuirait. */
  bare: 'text-ink hover:text-link',
} as const

export function Link({
  href,
  tone = 'default',
  children,
}: {
  href: string
  tone?: keyof typeof TONES
  children: React.ReactNode
}) {
  const external = href.startsWith('http')
  const className = cn('rounded-badge', TONES[tone])

  if (external) {
    return (
      <a href={href} rel="noopener noreferrer" target="_blank" className={className}>
        {children}
      </a>
    )
  }
  return (
    <NextLink href={href} className={className}>
      {children}
    </NextLink>
  )
}
```

- [ ] **Step 4 : `badge.tsx`**

```tsx
// src/ui/atoms/badge.tsx
import { cn } from '@/ui/cn'

const TONES = {
  neutral: 'bg-rule/50 text-ink-soft',
  verified: 'bg-verified-bg text-verified',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
} as const

/**
 * Une pastille de statut. `icon` n'est pas optionnel par confort : la couleur
 * ne doit jamais porter seule l'information, sans quoi l'ecran devient illisible
 * pour un daltonien et sur un devis photocopie.
 */
export function Badge({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof TONES
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-badge px-2.5 py-1',
        'text-xs font-semibold',
        TONES[tone],
      )}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
      {children}
    </span>
  )
}
```

- [ ] **Step 5 : Vérifier la compilation**

Run : `pnpm exec tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/ui/atoms
git commit -m "feat: atomes bouton, lien, pastille et indicateur d'attente"
```

---

## Task 9 : Les atomes de formulaire

**Files:**
- Create: `src/ui/atoms/input.tsx`
- Create: `src/ui/atoms/textarea.tsx`
- Create: `src/ui/atoms/select.tsx`
- Create: `src/ui/atoms/checkbox.tsx`

- [ ] **Step 1 : Le style partagé et `input.tsx`**

```tsx
// src/ui/atoms/input.tsx
import { cn } from '@/ui/cn'

/**
 * Le style commun a tous les controles de saisie.
 *
 * `text-base` (16 px) est obligatoire et non negociable : en dessous, iOS
 * zoome automatiquement a la prise de focus, ce qui casse la mise en page.
 * `min-h-11` donne les 44 px de cible tactile.
 */
export const controlStyle = cn(
  'w-full min-h-11 rounded-control px-3 py-2',
  'bg-raised text-ink text-base',
  'border border-field',
  'placeholder:text-ink-muted',
  'disabled:opacity-45',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:border-2',
)

type InputProps = Omit<React.ComponentProps<'input'>, 'className' | 'style'>

export function Input(props: InputProps) {
  return <input {...props} className={controlStyle} />
}
```

`Omit<…, 'className' | 'style'>` applique la règle d'architecture au niveau des types : il devient impossible de contourner le design system sur ce composant, et TypeScript le dit à la compilation plutôt qu'à la revue.

- [ ] **Step 2 : `textarea.tsx`**

```tsx
// src/ui/atoms/textarea.tsx
import { cn } from '@/ui/cn'
import { controlStyle } from './input'

type TextareaProps = Omit<React.ComponentProps<'textarea'>, 'className' | 'style'>

export function Textarea({ rows = 3, ...props }: TextareaProps) {
  return <textarea {...props} rows={rows} className={cn(controlStyle, 'resize-y')} />
}
```

- [ ] **Step 3 : `select.tsx`**

```tsx
// src/ui/atoms/select.tsx
import { cn } from '@/ui/cn'
import { controlStyle } from './input'

type SelectProps = Omit<React.ComponentProps<'select'>, 'className' | 'style'>

/**
 * Un `<select>` natif, volontairement.
 *
 * Un menu deroulant personnalise imposerait 'use client', du piegeage de focus
 * et de la navigation clavier a reimplementer — pour perdre le selecteur natif
 * d'iOS et d'Android, qui est meilleur que tout ce qu'on ecrirait.
 */
export function Select(props: SelectProps) {
  return <select {...props} className={cn(controlStyle, 'pr-8')} />
}
```

- [ ] **Step 4 : `checkbox.tsx`**

```tsx
// src/ui/atoms/checkbox.tsx

type CheckboxProps = Omit<
  React.ComponentProps<'input'>,
  'className' | 'style' | 'type'
>

/**
 * La case est a 20 px, mais son etiquette cliquable porte les 44 px de cible
 * tactile — c'est le role de `Field` en variante `checkbox`.
 */
export function Checkbox(props: CheckboxProps) {
  return (
    <input
      {...props}
      type="checkbox"
      className="size-5 shrink-0 rounded-badge border border-field accent-primary"
    />
  )
}
```

- [ ] **Step 5 : Vérifier la compilation**

Run : `pnpm exec tsc --noEmit`
Expected : aucune erreur.

- [ ] **Step 6 : Commit**

```bash
git add src/ui/atoms
git commit -m "feat: atomes de saisie, 16px et cible tactile de 44px"
```

---

## Task 10 : `Field` et `Card`

`Field` est la molécule la plus rentable du plan : les formulaires actuels n'ont ni `id`, ni `htmlFor`, ni erreur reliée au champ.

**Files:**
- Create: `src/ui/molecules/field.tsx`
- Create: `src/ui/molecules/card.tsx`

- [ ] **Step 1 : `field.tsx`**

```tsx
// src/ui/molecules/field.tsx
import { useId } from 'react'
import { cn } from '@/ui/cn'

/**
 * Cable l'accessibilite d'un champ, et personne d'autre ne le fait.
 *
 * Genere l'`id`, relie le `label`, branche `aria-describedby` sur l'aide et
 * l'erreur, pose `aria-invalid`. Un `Input` nu hors d'un `Field` est un defaut
 * de revue.
 *
 * `children` recoit les attributs a poser sur le controle : c'est un rendu par
 * fonction plutot qu'un clonage d'element, pour que TypeScript verifie que le
 * controle les accepte vraiment.
 */
export function Field({
  label,
  help,
  error,
  required = false,
  children,
}: {
  label: string
  help?: string
  error?: string
  required?: boolean
  children: (props: {
    id: string
    required: boolean
    'aria-describedby': string | undefined
    'aria-invalid': true | undefined
  }) => React.ReactNode
}) {
  const id = useId()
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <>
            {' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (obligatoire)</span>
          </>
        ) : null}
      </label>

      {children({
        id,
        required,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}

      {help ? (
        <p id={helpId} className="text-xs text-ink-muted">
          {help}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className={cn('text-xs font-medium text-danger')}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
```

L'astérisque est doublée d'un `(obligatoire)` en lecture d'écran : un `*` seul n'est pas annoncé de façon fiable. `role="alert"` fait annoncer l'erreur dès son apparition, sans voler le focus.

`useId` impose `'use client'` ? Non : `useId` fonctionne au rendu serveur et c'est précisément son intérêt — il produit un identifiant stable entre serveur et client. Aucune directive à ajouter.

- [ ] **Step 2 : `card.tsx`**

```tsx
// src/ui/molecules/card.tsx
import { cn } from '@/ui/cn'

/**
 * Une surface elevee.
 *
 * En mode sombre les ombres sont retirees : une ombre noire sur fond sombre est
 * invisible. L'elevation s'y exprime par une surface plus claire et une bordure.
 */
export function Card({
  elevation = 'e1',
  children,
}: {
  elevation?: 'flat' | 'e1' | 'e2'
  children: React.ReactNode
}) {
  const shadows = {
    flat: '',
    e1: 'shadow-e1 dark:shadow-none',
    e2: 'shadow-e2 dark:shadow-none',
  } as const

  return (
    <div
      className={cn(
        'rounded-card bg-card p-5',
        'border border-rule dark:border-rule',
        shadows[elevation],
      )}
    >
      {children}
    </div>
  )
}
```

Tailwind v4 associe la variante `dark:` à `prefers-color-scheme` par défaut, ce qui ignorerait un `data-theme` explicite. Ajouter dans `src/ui/tokens.css`, juste après le bloc `@theme inline` :

```css
@custom-variant dark {
  &:where([data-theme='dark'] *) { @slot; }
  @media (prefers-color-scheme: dark) {
    &:where(:root:not([data-theme='light']) *) { @slot; }
  }
}
```

- [ ] **Step 3 : Lancer tous les tests et le build**

Run : `pnpm test:unit && pnpm exec tsc --noEmit && pnpm build`
Expected : tests verts, aucune erreur de type, build réussi.

- [ ] **Step 4 : Commit**

```bash
git add src/ui/molecules src/ui/tokens.css
git commit -m "feat: Field cable l'accessibilite des champs, et Card la surface elevee"
```

---

## Task 11 : Vérification de bout en bout

- [ ] **Step 1 : Vérifier que les parcours existants ne sont pas cassés**

Run : `pnpm test:e2e`
Expected : les parcours de la connexion à la signature restent verts. Le layout et les polices ont changé ; aucun sélecteur de test ne doit en dépendre.

- [ ] **Step 2 : Vérifier le lint**

Run : `pnpm lint`
Expected : aucune erreur.

- [ ] **Step 3 : Vérifier visuellement le mode sombre**

Run : `pnpm dev`, ouvrir `/devis`, puis basculer le mode sombre du système.
Expected : les surfaces, le texte et les bordures suivent le thème. Les écrans ne sont pas encore repris — on vérifie seulement que le socle réagit, pas qu'ils sont beaux.

- [ ] **Step 4 : Commit du plan mis à jour et push**

```bash
git add docs/superpowers/plans/2026-08-08-ds1-socle-marque.md
git commit -m "docs: plan DS1 execute"
git push
```

---

## Auto-revue

**Couverture de la spec.** §4.1 à §4.3 → Task 5. §4.4 (tailles minimales, disparition du carré sous 24 px) → Task 5, Step 1 et 2. §5.1 à §5.3 → Tasks 1 à 3. §5.4 (bouton primaire en encre, exception publique) → Task 8, `TONES`. §5.5 (échelle typographique, `tabular-nums`) → Tasks 4, 6 et 7. §5.6 (rayons, ombres, espacement) → Tasks 1 et 3. §5.7 (mode sombre, anti-flash) → Tasks 3, 6 et 10. §6.2 (parité TS↔CSS) → Task 3. §6.3 règle 1 (serveur par défaut) → Task 8, commentaire d'en-tête. Règle 2 (pas de `className`) → Task 9, via `Omit`. Règle 3 (`Field`) → Task 10. Règle 4 (zéro dépendance) → Task 4, `cn`. §7.3 (les deux tests) → Tasks 2 et 3.

**Hors périmètre assumé, traité dans DS2 :** les atomes `Icon`, `HelperText`, `FieldError` et `Skeleton` (aucun écran ne les réclame avant le rang 2 ; `Field` porte déjà l'aide et l'erreur), les molécules `StatusBadge`, `SealBadge`, `LogoLockup`, `EmptyState`, `Toast`, `Tooltip`, `ButtonGroup`, `SummaryLine`, `Dialog`, `ThemeToggle`, tous les organismes, les trois gabarits, `public/brand/og.png`, et la vitrine `app/design-system/`.

**Cohérence des types.** `controlStyle` est exporté par `atoms/input.tsx` et consommé par `textarea.tsx` et `select.tsx`. Les clés de `roles.light` et `roles.dark` sont identiques, ce que Task 2 vérifie explicitement. `RoleName` et `Theme` sont définis en Task 1 et utilisés en Tasks 2 et 3. `Mark` accepte `tone: 'brand' | 'mono' | 'inverse'` ; `Seal` n'accepte que `'brand' | 'mono'`, puisqu'un médaillon inversé n'a pas de sens.

**Point à surveiller à l'exécution.** Task 7, Step 3 dépend de la signature réelle de `format` dans `src/domain/money.ts` : la vérifier avant d'écrire `money.tsx`.
