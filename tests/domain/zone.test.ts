import { describe, it, expect } from 'vitest'
import { parseZone } from '@/domain/zone'

describe('interpretation de la zone saisie', () => {
  it('reconnait un code postal a cinq chiffres', () => {
    expect(parseZone('33000', [])).toEqual({
      kind: 'postalCode',
      value: '33000',
      department: '33',
    })
  })

  it('accepte un code postal avec des espaces', () => {
    expect(parseZone(' 33 000 ', [])).toEqual({
      kind: 'postalCode',
      value: '33000',
      department: '33',
    })
  })

  it('traite tout le reste comme une commune, normalisee', () => {
    expect(parseZone('Bordeaux', ['33000|bordeaux'])).toEqual({
      kind: 'city',
      value: 'bordeaux',
      department: '33',
    })
  })

  it('translittere les accents de la commune', () => {
    expect(parseZone('Mérignac', ['33700|merignac'])).toEqual({
      kind: 'city',
      value: 'merignac',
      department: '33',
    })
  })

  it('ne deduit aucun departement d une commune inconnue', () => {
    // Pretendre a une proximite qu'on ne peut pas etablir serait mentir.
    expect(parseZone('Trifouillis', [])).toEqual({
      kind: 'city',
      value: 'trifouillis',
      department: null,
    })
  })

  it('rejette une saisie vide', () => {
    expect(parseZone('   ', [])).toBeNull()
  })
})
