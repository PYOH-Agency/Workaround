import { describe, it, expect } from 'vitest'
import { isValidSiret, normalizeSiret } from '@/domain/siret'

describe('siret', () => {
  it('supprime espaces et ponctuation avant validation', () => {
    expect(normalizeSiret(' 552 100 554 00021 ')).toBe('55210055400021')
  })

  it('accepte un SIRET dont la cle de Luhn est correcte', () => {
    expect(isValidSiret('55210055400021')).toBe(true)
  })

  it('refuse un SIRET dont un chiffre a ete altere', () => {
    expect(isValidSiret('55210055400022')).toBe(false)
  })

  it('refuse une longueur incorrecte ou des caracteres non numeriques', () => {
    expect(isValidSiret('123')).toBe(false)
    expect(isValidSiret('5521005540002A')).toBe(false)
  })
})
