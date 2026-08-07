import { describe, it, expect } from 'vitest'
import { toCents, multiply, applyRate, format } from '@/domain/money'

describe('money', () => {
  it('convertit des euros en centimes', () => {
    expect(toCents('1250.50')).toBe(125050)
    expect(toCents('0.01')).toBe(1)
    expect(toCents('1250')).toBe(125000)
  })

  it('gere les montants negatifs, y compris sous l unite', () => {
    expect(toCents('-10.50')).toBe(-1050)
    // Piege : la partie entiere de '-0.50' est nulle, son signe disparait.
    expect(toCents('-0.50')).toBe(-50)
  })

  it('refuse plus de deux decimales', () => {
    expect(() => toCents('10.123')).toThrow('deux decimales')
  })

  it('multiplie un montant par une quantite decimale en arrondissant au centime', () => {
    // 12,50 EUR x 3,5 = 43,75 EUR
    expect(multiply(1250, '3.5')).toBe(4375)
    // 10,00 EUR x 0,333 = 3,33 EUR (arrondi au superieur a partir de 0,5)
    expect(multiply(1000, '0.333')).toBe(333)
    expect(multiply(1000, '0.335')).toBe(335)
  })

  it('applique un taux de TVA en arrondissant au centime superieur a 0,5', () => {
    // 1000,00 EUR a 5,5 % = 55,00 EUR
    expect(applyRate(100000, 550)).toBe(5500)
    // 33,33 EUR a 20 % = 6,666 -> 6,67 EUR
    expect(applyRate(3333, 2000)).toBe(667)
  })

  it('formate en euros avec une espace de milliers ordinaire', () => {
    expect(format(125050)).toBe('1 250,50')
    expect(format(0)).toBe('0,00')
    expect(format(-1050)).toBe('-10,50')
  })
})
