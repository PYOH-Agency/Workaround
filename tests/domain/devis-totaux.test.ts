import { describe, it, expect } from 'vitest'
import { calculerTotaux, type LigneCalcul } from '@/domain/devis-totaux'

const ligne = (p: Partial<LigneCalcul> = {}): LigneCalcul => ({
  quantite: '1',
  prixUnitaireHT: 10000,
  tauxTVA: 2000,
  ...p,
})

describe('calculerTotaux', () => {
  it('renvoie zero pour un devis vide', () => {
    expect(calculerTotaux([])).toEqual({ totalHT: 0, totalTVA: 0, totalTTC: 0, parTaux: [] })
  })

  it('calcule une ligne simple a 20 %', () => {
    const r = calculerTotaux([ligne()])
    expect(r.totalHT).toBe(10000)
    expect(r.totalTVA).toBe(2000)
    expect(r.totalTTC).toBe(12000)
  })

  it('applique la quantite au prix unitaire', () => {
    const r = calculerTotaux([ligne({ quantite: '2.5', prixUnitaireHT: 4000 })])
    expect(r.totalHT).toBe(10000)
  })

  it('regroupe la TVA par taux et arrondit sur le sous-total, pas ligne par ligne', () => {
    // Trois lignes a 33,33 EUR HT en TVA 20 %.
    // Arrondi ligne par ligne : 6,67 x 3 = 20,01 EUR. Faux.
    // Arrondi sur le sous-total : 99,99 x 20 % = 19,998 -> 20,00 EUR. Correct.
    const lignes = [
      ligne({ prixUnitaireHT: 3333 }),
      ligne({ prixUnitaireHT: 3333 }),
      ligne({ prixUnitaireHT: 3333 }),
    ]
    const r = calculerTotaux(lignes)
    expect(r.totalHT).toBe(9999)
    expect(r.totalTVA).toBe(2000)
    expect(r.totalTTC).toBe(11999)
  })

  it('ventile plusieurs taux et les trie par taux croissant', () => {
    const r = calculerTotaux([
      ligne({ prixUnitaireHT: 100000, tauxTVA: 2000 }),
      ligne({ prixUnitaireHT: 200000, tauxTVA: 550 }),
      ligne({ prixUnitaireHT: 50000, tauxTVA: 1000 }),
    ])
    expect(r.totalHT).toBe(350000)
    expect(r.parTaux).toEqual([
      { taux: 550, baseHT: 200000, montantTVA: 11000 },
      { taux: 1000, baseHT: 50000, montantTVA: 5000 },
      { taux: 2000, baseHT: 100000, montantTVA: 20000 },
    ])
    expect(r.totalTVA).toBe(36000)
    expect(r.totalTTC).toBe(386000)
  })

  it('gere une ligne negative (remise)', () => {
    const r = calculerTotaux([ligne({ prixUnitaireHT: 100000 }), ligne({ prixUnitaireHT: -10000 })])
    expect(r.totalHT).toBe(90000)
    expect(r.totalTVA).toBe(18000)
  })
})
