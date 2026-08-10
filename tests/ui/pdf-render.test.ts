import { describe, expect, it } from 'vitest'
import { renderQuotePdf } from '@/pdf/quote-pdf'
import type { PublicQuote } from '@/services/quote-public'

/**
 * Rend un vrai PDF et inspecte les polices qu'il embarque.
 *
 * Un `Font.register` qui echoue ne leve pas : react-pdf retombe silencieusement
 * sur Helvetica. Sans ce test, on livrerait des devis dans une police qui n'est
 * pas celle de la marque, et personne ne le verrait avant qu'un client le
 * remarque.
 */

const QUOTE: PublicQuote = {
  id: 'q1',
  status: 'sent',
  companyId: 'c1',
  number: 'D-2026-000123',
  issuedOn: '12/03/2026',
  company: {
    legalName: 'GARANCE PLOMBERIE',
    siret: '50769820700018',
    address: '12 rue Fondaudège, 33000 Bordeaux',
    legal: {
      legalFormLabel: 'EI',
      registrationNumber: 'RCS Bordeaux 507 698 207',
      phone: '0556000000',
      email: 'contact@garance.test',
      vatExempt: false,
      vatNumber: 'FR12507698207',
      quoteValidityDays: 90,
      paymentTerms: 'Acompte de 30 % à la commande.',
      insurerName: 'AXA',
      insurerAddress: '313 Terrasses de l’Arche, 92727 Nanterre',
      policyNumber: '8842-117-C',
      coveredActivities: 'Plomberie, chauffage',
      coverageArea: 'France métropolitaine',
    },
    passportUrl: 'https://dequerre.test/p/garance-plomberie-507698207',
  },
  customer: {
    id: 'cu1',
    name: 'Paul Martin',
    phone: '0600000000',
    isIndividual: true,
    propertyAddress: '5 cours Victor Hugo, 33000 Bordeaux',
  },
  committedLeadTimeDays: 10,
  validityDays: 90,
  retentionRate: 0,
  lines: [
    {
      label: 'Chauffe-eau 200 L posé',
      unit: 'u',
      quantity: '1',
      unitPriceExclTax: 85000,
      taxRate: 1000,
    },
  ],
  totals: {
    totalExclTax: 85000,
    totalTax: 8500,
    totalInclTax: 93500,
    byRate: [{ rate: 1000, baseExclTax: 85000, taxAmount: 8500 }],
  },
}

describe('rendu du PDF de devis', () => {
  it('embarque Archivo et Inter, et pas Helvetica', async () => {
    const buffer = await renderQuotePdf(QUOTE)
    const raw = buffer.toString('latin1')

    expect(raw.startsWith('%PDF-')).toBe(true)
    expect(raw).toContain('Archivo')
    expect(raw).toContain('Inter')

    // Le repli silencieux qu'on veut interdire.
    expect(raw).not.toContain('Helvetica')
  }, 30_000)
})
