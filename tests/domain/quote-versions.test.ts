import { describe, it, expect } from 'vitest'
import {
  engagedTotal,
  initialTotal,
  assertAmendable,
  referenceVersion,
  type QuoteVersion,
} from '@/domain/quote-versions'

const version = (overrides: Partial<QuoteVersion> = {}): QuoteVersion => ({
  id: 'v1',
  version: 1,
  status: 'signed',
  totalInclTax: 100000,
  signedAt: new Date('2026-03-02T09:00:00Z'),
  ...overrides,
})

describe('version de reference', () => {
  it('est la seule version quand il n y a pas d avenant', () => {
    expect(referenceVersion([version()])?.id).toBe('v1')
  })

  it('est le dernier avenant SIGNE', () => {
    const versions = [
      version({ id: 'v1', version: 1 }),
      version({ id: 'v2', version: 2, totalInclTax: 150000 }),
    ]
    expect(referenceVersion(versions)?.id).toBe('v2')
  })

  it('ignore un avenant non encore signe', () => {
    // Tant qu'il n'est pas signe, il n'engage personne : le client ne l'a pas
    // accepte, et l'artisan ne peut pas facturer dessus.
    const versions = [
      version({ id: 'v1', version: 1 }),
      version({ id: 'v2', version: 2, status: 'sent', totalInclTax: 150000 }),
    ]
    expect(referenceVersion(versions)?.id).toBe('v1')
  })

  it('ne se fie pas a l ordre de lecture', () => {
    const versions = [
      version({ id: 'v3', version: 3, totalInclTax: 200000 }),
      version({ id: 'v1', version: 1 }),
      version({ id: 'v2', version: 2, totalInclTax: 150000 }),
    ]
    expect(referenceVersion(versions)?.id).toBe('v3')
  })

  it("n'existe pas tant qu'aucune version n'est signee", () => {
    expect(referenceVersion([version({ status: 'draft' })])).toBeNull()
  })
})

describe('totaux', () => {
  const versions = [
    version({ id: 'v1', version: 1, totalInclTax: 100000 }),
    version({ id: 'v2', version: 2, totalInclTax: 150000 }),
  ]

  it('le total engage est celui de la version de reference, pas une somme', () => {
    // Un avenant REMPLACE : additionner ferait payer deux fois les lignes
    // reprises de la version precedente.
    expect(engagedTotal(versions)).toBe(150000)
  })

  it('le total initial reste celui de la version 1, pour toujours', () => {
    // C'est lui que la metrique comparera au total facture.
    expect(initialTotal(versions)).toBe(100000)
  })

  it('valent zero sans aucune version signee', () => {
    expect(engagedTotal([version({ status: 'draft' })])).toBe(0)
  })
})

describe('conditions de creation d un avenant', () => {
  const signed = [version()]

  it('accepte sur un devis signe', () => {
    expect(() => assertAmendable(signed, 0)).not.toThrow()
  })

  it('refuse tant qu aucune version n est signee', () => {
    expect(() => assertAmendable([version({ status: 'draft' })], 0)).toThrow('signé')
  })

  it('refuse quand une version est deja en cours', () => {
    // Deux avenants ouverts en meme temps rendraient le total engage
    // indeterminable, et le client ne saurait pas lequel il signe.
    const pending = [version(), version({ id: 'v2', version: 2, status: 'sent' })]
    expect(() => assertAmendable(pending, 0)).toThrow('en cours')
  })

  it('refuse un avenant qui descendrait sous le deja facture', () => {
    // Sinon le reste a facturer deviendrait negatif, et une facture emise —
    // donc immuable — se retrouverait sans contrepartie contractuelle.
    expect(() => assertAmendable(signed, 120000)).not.toThrow()
    expect(() => assertAmendable(signed, 120000, 90000)).toThrow('inférieur')
  })
})
