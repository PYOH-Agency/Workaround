import { describe, it, expect } from 'vitest'
import { formatInvoiceNumber, INVOICE_PREFIX } from '@/domain/invoice-number'

describe('numero de facture', () => {
  it('formate une sequence sur quatre chiffres', () => {
    expect(formatInvoiceNumber(2026, 1)).toBe('F2026-0001')
    expect(formatInvoiceNumber(2026, 42)).toBe('F2026-0042')
  })

  it('se distingue du numero de devis', () => {
    // Un artisan doit voir au premier coup d'oeil s'il tient un devis ou une
    // facture : la confusion se paie en litige.
    expect(INVOICE_PREFIX).not.toBe('D')
  })

  it('deborde proprement au-dela de 9999', () => {
    expect(formatInvoiceNumber(2026, 10000)).toBe('F2026-10000')
  })

  it('refuse une sequence nulle ou negative', () => {
    // Une sequence continue commence a 1. Un zero signalerait un compteur
    // jamais initialise, donc un trou.
    expect(() => formatInvoiceNumber(2026, 0)).toThrow('sequence')
    expect(() => formatInvoiceNumber(2026, -1)).toThrow('sequence')
  })
})
