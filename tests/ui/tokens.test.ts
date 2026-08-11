import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { hatch, roles, type Theme } from '@/ui/tokens'

/**
 * Parite entre la source de verite TypeScript et sa projection CSS.
 *
 * Sans ce test, le PDF — qui importe le TS — et l'interface — qui lit le CSS —
 * divergeraient au premier ajustement de couleur, et personne ne s'en
 * apercevrait avant qu'un client recoive un devis aux mauvaises couleurs.
 */

const css = readFileSync(
  fileURLToPath(new URL('../../src/ui/tokens.css', import.meta.url)),
  'utf8',
)

/**
 * Extrait les paires `--dq-nom: #HEX` d'un bloc CSS delimite par des accolades.
 *
 * Le selecteur est cherche en debut de ligne : les memes chaines apparaissent
 * dans les commentaires de `tokens.css` et dans la variante `dark:`, et un
 * `indexOf` brut lirait le mauvais bloc en silence.
 */
/** Isole le corps `{ ... }` du bloc designe par `selector`, accolades comprises. */
function blockBody(selector: string): string {
  const start = css.search(
    new RegExp(`^[ \\t]*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm'),
  )
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
  return css.slice(open, end)
}

function readBlock(selector: string): Record<string, string> {
  const body = blockBody(selector)
  const out: Record<string, string> = {}
  for (const [, name, value] of body.matchAll(
    /--dq-([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g,
  )) {
    out[name] = value.toUpperCase()
  }
  return out
}

/**
 * `--dq-hatch` est un `rgba(...)`, pas un `#RRGGBB` : `readBlock` ne le voit
 * jamais, puisque son regex n'extrait que des couleurs opaques hexadecimales.
 * C'etait le second trou signale par la relecture — le premier etant
 * l'absence de `hatch` dans `roles` (voir tokens.ts).
 */
function readHatch(selector: string): string {
  const body = blockBody(selector)
  const match = /--dq-hatch:\s*(rgba\([^)]+\))/.exec(body)
  expect(match, `--dq-hatch absent du bloc "${selector}"`).not.toBeNull()
  return match![1].replace(/\s+/g, '')
}

/**
 * Les blocs dont les valeurs doivent correspondre a `roles`.
 *
 * Le bloc clair est designe par `:root,` et non par `[data-theme='light'] {` :
 * ce dernier apparait deux fois depuis que `color-scheme` a le sien, et
 * `readBlock` prend la premiere correspondance. Viser le selecteur qui n'existe
 * qu'une fois retire la dependance a l'ordre des regles.
 */
const BLOCKS: Record<Theme, string[]> = {
  light: [':root,'],
  dark: ["[data-theme='dark'] {", '@media (prefers-color-scheme: dark)'],
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

  it('le bloc clair couvre aussi la racine sans attribut', () => {
    expect(css).toMatch(/^:root,\n\[data-theme='light'\] \{/m)
  })
})

/**
 * `hatch` (voir tokens.ts) n'est pas dans `roles` : sans ce bloc, `--dq-hatch`
 * pourrait diverger entre `tokens.ts` et `tokens.css`, ou entre les deux
 * blocs sombres eux-memes, sans qu'aucun test ne le remarque — exactement le
 * second trou signale par la relecture.
 */
describe('parite du jeton hatch', () => {
  it(`clair — ":root," declare la meme valeur que hatch.light`, () => {
    expect(readHatch(":root,")).toBe(hatch.light)
  })

  for (const selector of BLOCKS.dark) {
    it(`sombre — ${selector} declare la meme valeur que hatch.dark`, () => {
      expect(readHatch(selector)).toBe(hatch.dark)
    })
  }
})

/**
 * `PublicShell` pose `data-theme="light"` sur un conteneur, pas sur `<html>`.
 * Ancres a `:root`, les blocs de theme ignoraient cet attribut : la page
 * publique heritait des variables sombres de la racine tout en activant ses
 * utilitaires `dark:`, et sortait en theme hybride.
 */
describe('le theme repond a un attribut imbrique', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(`\`[data-theme='${theme}']\` n'est pas ancre a \`:root\``, () => {
      expect(css).not.toContain(`:root[data-theme='${theme}']`)
    })
  }

  it('la variante `dark:` est neutralisee sous un sous-arbre clair', () => {
    const branches = [...css.matchAll(/^\s*&(.+) \{$/gm)].map(([, s]) => s)
    expect(branches).toHaveLength(2)
    for (const branch of branches) {
      expect(branch).toContain(":not(:where([data-theme='light'] *))")
    }
  })
})
