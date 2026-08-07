import { describe, it, expect } from 'vitest'
import { euros, multiplier, appliquerTaux, formater } from '@/domain/money'

describe('money', () => {
  it('convertit des euros en centimes', () => {
    expect(euros('1250.50')).toBe(125050)
    expect(euros('0.01')).toBe(1)
    expect(euros('1250')).toBe(125000)
  })

  it('gere les montants negatifs, y compris sous l unite', () => {
    expect(euros('-10.50')).toBe(-1050)
    // Piege : BigInt('-0') vaut 0n, le signe doit venir de la chaine.
    expect(euros('-0.50')).toBe(-50)
  })

  it('refuse plus de deux decimales', () => {
    expect(() => euros('10.123')).toThrow('deux decimales')
  })

  it('multiplie un montant par une quantite decimale en arrondissant au centime', () => {
    // 12,50 EUR x 3,5 = 43,75 EUR
    expect(multiplier(1250, '3.5')).toBe(4375)
    // 10,00 EUR x 0,333 = 3,33 EUR (arrondi au superieur a partir de 0,5)
    expect(multiplier(1000, '0.333')).toBe(333)
    expect(multiplier(1000, '0.335')).toBe(335)
  })

  it('applique un taux de TVA en arrondissant au centime superieur a 0,5', () => {
    // 1000,00 EUR a 5,5 % = 55,00 EUR
    expect(appliquerTaux(100000, 550)).toBe(5500)
    // 33,33 EUR a 20 % = 6,666 -> 6,67 EUR
    expect(appliquerTaux(3333, 2000)).toBe(667)
  })

  it('formate en euros avec une espace de milliers ordinaire', () => {
    expect(formater(125050)).toBe('1 250,50')
    expect(formater(0)).toBe('0,00')
    expect(formater(-1050)).toBe('-10,50')
  })
})
