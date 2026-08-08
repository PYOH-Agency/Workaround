import { describe, expect, it } from 'vitest'
import { parseSiretInput } from '@/domain/siret'

describe('parseSiretInput', () => {
  it('accepte un SIRET avec des espaces et rend le SIREN', () => {
    expect(parseSiretInput('507 698 207 00036')).toEqual({ siren: '507698207' })
  })

  it('accepte un SIRET colle', () => {
    expect(parseSiretInput('50769820700036')).toEqual({ siren: '507698207' })
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

  it('refuse un SIRET dont la cle de Luhn est fausse', () => {
    expect(parseSiretInput('50769820700037')).toEqual({
      error: 'Ce SIRET n’existe pas : vérifiez les chiffres.',
    })
  })
})
