import { describe, it, expect } from 'vitest'
import {
  detectWaitingCertificates,
  detectUnreachableCompanies,
  type PendingCertificate,
  type ExpiringCertificate,
} from '@/domain/detectors/certificates'

// 2026-08-06 est un jeudi.
const NOW = new Date('2026-08-06T10:00:00Z')

describe('attestation en attente de revue', () => {
  const pending = (uploadedAt: string): PendingCertificate => ({
    id: 'cert-1',
    companyName: 'PLOMBERIE DU TEST',
    uploadedAt: new Date(uploadedAt),
  })

  it('ne signale rien en deca de deux jours ouvres', () => {
    // Depose mardi, on est jeudi : deux jours ouvres, pas plus.
    expect(detectWaitingCertificates([pending('2026-08-04T10:00:00Z')], NOW)).toEqual([])
  })

  it('signale au-dela de deux jours ouvres', () => {
    const found = detectWaitingCertificates([pending('2026-08-03T10:00:00Z')], NOW)

    expect(found).toHaveLength(1)
    expect(found[0].severity).toBe('attention')
    expect(found[0].type).toBe('certificate_waiting')
    expect(found[0].detail).toContain('PLOMBERIE DU TEST')
    expect(found[0].href).toBe('/attestations/cert-1')
  })

  it('ne compte pas le week-end', () => {
    // Depose vendredi 31 juillet, on est jeudi 6 : quatre jours ouvres.
    expect(detectWaitingCertificates([pending('2026-07-31T10:00:00Z')], NOW)).toHaveLength(1)
  })
})

describe('entreprise qu on ne peut pas prevenir', () => {
  const expiring = (overrides: Partial<ExpiringCertificate> = {}): ExpiringCertificate => ({
    companyId: 'c1',
    companyName: 'SANS ADRESSE',
    companyEmail: null,
    validUntil: new Date('2026-09-15'),
    ...overrides,
  })

  it('signale une echeance proche sans adresse', () => {
    const found = detectUnreachableCompanies([expiring()], NOW)

    expect(found).toHaveLength(1)
    // Bloquant : sans preavis, la suspension serait irreguliere (art. 22.3).
    expect(found[0].severity).toBe('blocking')
    expect(found[0].subjectId).toBe('c1')
  })

  it('ne signale rien quand l entreprise est joignable', () => {
    expect(detectUnreachableCompanies([expiring({ companyEmail: 'x@y.fr' })], NOW)).toEqual([])
  })

  it('ne signale rien quand l echeance est lointaine', () => {
    // Au-dela du premier palier de preavis, il reste le temps d'agir.
    expect(detectUnreachableCompanies([expiring({ validUntil: new Date('2027-06-01') })], NOW)).toEqual([])
  })

  it('ne signale rien pour une echeance deja passee', () => {
    // La suspension a deja eu lieu : le preavis n'a plus d'objet, et le signal
    // ne ferait que polluer la file indefiniment.
    expect(detectUnreachableCompanies([expiring({ validUntil: new Date('2026-01-01') })], NOW)).toEqual([])
  })
})
