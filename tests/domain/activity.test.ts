import { describe, it, expect } from 'vitest'
import { requiredInsurance, ACTIVITY_FAMILIES, type Activity } from '@/domain/activity'

const plumbing: Activity = {
  code: '30',
  label: 'Plomberie — Installations sanitaires',
  family: 'technical',
  requiresDecennale: true,
}

const landscaping: Activity = {
  code: '4.1',
  label: 'Paysagiste',
  family: 'site',
  requiresDecennale: false,
}

describe('assurance requise par activite', () => {
  it('exige la decennale sur un ouvrage', () => {
    expect(requiredInsurance(plumbing)).toBe('decennale')
  })

  it("exige la RC Pro sur une activite qui n'engage pas l'article 1792", () => {
    // Le paysagiste figure dans la nomenclature des assureurs sans pour autant
    // constituer un ouvrage : deduire la decennale de l'appartenance a la liste
    // produirait une exigence fausse.
    expect(requiredInsurance(landscaping)).toBe('rc_pro')
  })

  it('couvre les cinq familles de la nomenclature', () => {
    expect(ACTIVITY_FAMILIES.map((f) => f.code)).toEqual([
      'site',
      'structure',
      'envelope',
      'fitting',
      'technical',
    ])
  })
})
