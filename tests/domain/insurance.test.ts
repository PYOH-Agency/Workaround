import { describe, it, expect } from 'vitest'
import { missingInsuranceMentions, hasLegalInsuranceMentions } from '@/domain/insurance'

const complete = {
  insurerName: 'SMABTP',
  insurerAddress: '114 avenue Émile Zola, 75015 Paris',
  policyNumber: 'D-2024-889321',
  coveredActivities: 'Plomberie, chauffage, sanitaire',
  coverageArea: 'France métropolitaine',
}

describe('mentions d assurance obligatoires (art. L243-2)', () => {
  it('accepte un bloc complet', () => {
    expect(missingInsuranceMentions(complete)).toEqual([])
    expect(hasLegalInsuranceMentions(complete)).toBe(true)
  })

  it('liste chaque mention manquante, pour que le formulaire puisse guider', () => {
    expect(missingInsuranceMentions({})).toEqual([
      'insurerName',
      'insurerAddress',
      'policyNumber',
      'coveredActivities',
      'coverageArea',
    ])
  })

  it('traite une chaine vide ou blanche comme absente', () => {
    expect(missingInsuranceMentions({ ...complete, policyNumber: '   ' })).toEqual(['policyNumber'])
    expect(missingInsuranceMentions({ ...complete, insurerName: '' })).toEqual(['insurerName'])
  })

  it('refuse un bloc partiel', () => {
    expect(hasLegalInsuranceMentions({ ...complete, coverageArea: null })).toBe(false)
  })
})
