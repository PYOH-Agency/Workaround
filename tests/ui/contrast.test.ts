import { describe, expect, it } from 'vitest'
import { roles, THEME_INDEPENDENT, type RoleName, type Theme } from '@/ui/tokens'

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

/** Distance euclidienne dans l'espace RVB. */
function distance(a: string, b: string): number {
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  }
  const [r1, g1, b1] = parse(a)
  const [r2, g2, b2] = parse(b)
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2)
}

/**
 * Deux boutons pleins ne doivent jamais se ressembler.
 *
 * Ce test existe a cause d'un defaut reel : en inversant mecaniquement tous les
 * roles pour le mode sombre, le bouton de conversion valait #F0A87E et le
 * bouton destructif #EC8B80 — deux peches a 29 de distance, visuellement
 * identiques. Le rapport de contraste ne l'avait pas vu, et pour cause : il
 * mesure la luminance, pas la teinte. Les deux etaient a 1,24 l'un de l'autre,
 * ce qui ressemble a un echec mais n'en est pas un au sens WCAG.
 *
 * Seuil a 60 : les deux peches etaient a 29, la paire corrigee est a 103.
 */
describe('les actions pleines restent distinguables', () => {
  const MIN = 60
  const PAIRS: Array<[RoleName, RoleName]> = [
    ['conversion', 'danger-solid'],
    ['primary', 'danger-solid'],
    ['primary', 'conversion'],
  ]

  for (const theme of THEMES) {
    for (const [a, b] of PAIRS) {
      it(`${theme} : ${a} et ${b} sont a plus de ${MIN} de distance`, () => {
        const palette = roles[theme]
        const d = distance(palette[a], palette[b])
        expect(d, `${palette[a]} vs ${palette[b]} = ${d.toFixed(0)}`).toBeGreaterThan(MIN)
      })
    }
  }
})

/**
 * Un jeton qui porte a la fois son fond et son texte est auto-suffisant : il ne
 * repose sur aucune surface, donc il ne doit pas s'inverser. Inverser
 * mecaniquement, c'est fabriquer le defaut decrit ci-dessus.
 */
describe('les roles auto-suffisants ne dependent pas du theme', () => {
  for (const name of THEME_INDEPENDENT) {
    it(`${name} est identique en clair et en sombre`, () => {
      expect(roles.light[name]).toBe(roles.dark[name])
    })
  }
})
