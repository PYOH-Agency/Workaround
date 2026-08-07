import { describe, it, expect } from 'vitest'
import { addressFingerprint, normalizeLine } from '@/domain/address'

describe('address', () => {
  it('normalise casse, accents, ponctuation et abreviations', () => {
    expect(normalizeLine('12, Rue Fondaudège')).toBe('12 rue fondaudege')
    expect(normalizeLine('12 R. Fondaudege')).toBe('12 rue fondaudege')
    expect(normalizeLine('5 BD  du Président Wilson')).toBe('5 boulevard du president wilson')
  })

  it('produit la meme empreinte pour deux ecritures de la meme adresse', () => {
    const a = addressFingerprint({
      line1: '12, Rue Fondaudège',
      postalCode: '33000',
      city: 'Bordeaux',
    })
    const b = addressFingerprint({
      line1: '12 r. fondaudege',
      postalCode: '33 000',
      city: 'BORDEAUX',
    })
    expect(a).toBe(b)
  })

  it('produit des empreintes differentes pour deux numeros differents', () => {
    const a = addressFingerprint({
      line1: '12 rue Fondaudege',
      postalCode: '33000',
      city: 'Bordeaux',
    })
    const b = addressFingerprint({
      line1: '14 rue Fondaudege',
      postalCode: '33000',
      city: 'Bordeaux',
    })
    expect(a).not.toBe(b)
  })
})
