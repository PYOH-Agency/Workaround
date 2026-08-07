import { describe, it, expect } from 'vitest'
import { empreinteAdresse, normaliserLigne } from '@/domain/adresse'

describe('adresse', () => {
  it('normalise casse, accents, ponctuation et abreviations', () => {
    expect(normaliserLigne('12, Rue Fondaudège')).toBe('12 rue fondaudege')
    expect(normaliserLigne('12 R. Fondaudege')).toBe('12 rue fondaudege')
    expect(normaliserLigne('5 BD  du Président Wilson')).toBe('5 boulevard du president wilson')
  })

  it('produit la meme empreinte pour deux ecritures de la meme adresse', () => {
    const a = empreinteAdresse({ ligne1: '12, Rue Fondaudège', codePostal: '33000', ville: 'Bordeaux' })
    const b = empreinteAdresse({ ligne1: '12 r. fondaudege', codePostal: '33 000', ville: 'BORDEAUX' })
    expect(a).toBe(b)
  })

  it('produit des empreintes differentes pour deux numeros differents', () => {
    const a = empreinteAdresse({ ligne1: '12 rue Fondaudege', codePostal: '33000', ville: 'Bordeaux' })
    const b = empreinteAdresse({ ligne1: '14 rue Fondaudege', codePostal: '33000', ville: 'Bordeaux' })
    expect(a).not.toBe(b)
  })
})
