import { describe, it, expect } from 'vitest'
import { isValidSiret, normalizeSiret, parseSiretInput } from '@/domain/siret'

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

describe('parseSiretInput', () => {
  it('accepte un SIRET avec des espaces et rend le SIREN', () => {
    expect(parseSiretInput('507 698 207 00036')).toEqual({
      siren: '507698207',
      siret: '50769820700036',
    })
  })

  it('accepte un SIRET colle', () => {
    expect(parseSiretInput('50769820700036')).toEqual({
      siren: '507698207',
      siret: '50769820700036',
    })
  })

  it('refuse une saisie trop courte', () => {
    expect(parseSiretInput('5076982')).toEqual({
      error: 'Ce SIRET est incomplet : il compte 14 chiffres.',
    })
  })

  it('refuse une saisie vide', () => {
    expect(parseSiretInput('   ')).toEqual({
      error: 'Ce SIRET est incomplet : il compte 14 chiffres.',
    })
  })

  it('refuse une saisie trop longue', () => {
    expect(parseSiretInput('123456789012345')).toEqual({
      error: 'Ce SIRET est trop long : il compte 14 chiffres.',
    })
  })

  it('refuse une saisie sans chiffres', () => {
    expect(parseSiretInput('abcdefghijklmn')).toEqual({
      error: 'Ce SIRET ne doit contenir que des chiffres.',
    })
  })

  it('refuse un SIRET dont la cle de Luhn est fausse', () => {
    expect(parseSiretInput('50769820700037')).toEqual({
      error: 'Ce SIRET n’existe pas : vérifiez les chiffres.',
    })
  })
})

describe('parseSiretInput rend aussi le SIRET', () => {
  it('rend les quatorze chiffres normalises', () => {
    const parsed = parseSiretInput('507 698 207 00036')
    expect(parsed).toEqual({ siren: '507698207', siret: '50769820700036' })
  })

  it('ne rend pas de SIRET quand la saisie est refusee', () => {
    const parsed = parseSiretInput('123')
    expect(parsed).not.toHaveProperty('siret')
  })
})
