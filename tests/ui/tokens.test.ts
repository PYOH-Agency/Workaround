import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { roles, type Theme } from '@/ui/tokens'

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
  for (const [, name, value] of body.matchAll(
    /--dq-([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g,
  )) {
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
