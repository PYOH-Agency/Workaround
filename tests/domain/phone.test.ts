import { describe, it, expect } from 'vitest'
import { toInternational } from '@/domain/phone'

describe('normalisation des numeros de telephone', () => {
  it('convertit un numero francais en format international sans plus', () => {
    expect(toInternational('0612345678')).toBe('33612345678')
    expect(toInternational('0756789012')).toBe('33756789012')
  })

  it('tolere les separateurs que les gens tapent vraiment', () => {
    expect(toInternational('06 12 34 56 78')).toBe('33612345678')
    expect(toInternational('06.12.34.56.78')).toBe('33612345678')
    expect(toInternational('06-12-34-56-78')).toBe('33612345678')
  })

  it('accepte un numero deja international', () => {
    expect(toInternational('+33612345678')).toBe('33612345678')
    expect(toInternational('0033612345678')).toBe('33612345678')
    expect(toInternational('33612345678')).toBe('33612345678')
  })

  it('refuse un numero fixe : un code SMS n y arrivera jamais', () => {
    expect(() => toInternational('0556123456')).toThrow('mobile')
    expect(() => toInternational('+33156123456')).toThrow('mobile')
  })

  it('refuse un numero de longueur invalide', () => {
    expect(() => toInternational('0612345')).toThrow('invalide')
    expect(() => toInternational('')).toThrow('invalide')
  })
})
