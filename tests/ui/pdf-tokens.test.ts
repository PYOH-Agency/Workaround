import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { pdf } from '@/pdf/tokens'
import { roles } from '@/ui/tokens'

const source = readFileSync(
  fileURLToPath(new URL('../../src/pdf/quote-pdf.tsx', import.meta.url)),
  'utf8',
)

/**
 * Le PDF est la piece que le client conserve. S'il porte ses propres couleurs,
 * il derive de l'interface au premier ajustement et personne ne s'en apercoit
 * avant qu'un devis parte avec les mauvaises.
 */
describe('le PDF ne contient aucune couleur en dur', () => {
  it('aucun litteral hexadecimal dans quote-pdf.tsx', () => {
    const found = source.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []
    expect(found).toEqual([])
  })

  it('les couleurs du PDF viennent des roles clairs', () => {
    expect(pdf.ink).toBe(roles.light.ink)
    expect(pdf.soft).toBe(roles.light['ink-soft'])
    expect(pdf.muted).toBe(roles.light['ink-muted'])
    expect(pdf.rule).toBe(roles.light.rule)
    expect(pdf.field).toBe(roles.light.field)
  })

  it("n'utilise plus les polices par defaut du moteur", () => {
    expect(source).not.toContain('Helvetica')
  })
})
