import { describe, it, expect } from 'vitest'
import { companySlug, sirenFromSlug } from '@/domain/slug'

describe('adresse publique d une entreprise', () => {
  it('compose un identifiant lisible a partir du nom et du SIREN', () => {
    expect(companySlug('BD PLOMBERIE', '50769820700036')).toBe('bd-plomberie-507698207')
  })

  it('translittere les diacritiques', () => {
    expect(companySlug('Menuiserie Décorée', '50769820700036')).toBe('menuiserie-decoree-507698207')
  })

  it('retire la ponctuation et les doublons de tirets', () => {
    expect(companySlug('SARL  DUPONT & FILS (BTP)', '50769820700036')).toBe(
      'sarl-dupont-fils-btp-507698207',
    )
  })

  it('supporte un nom entierement non alphanumerique', () => {
    // Sans garde, on produirait « --507698207 » : un identifiant valide mais
    // illisible, et deux entreprises differentes s'y ressembleraient.
    expect(companySlug('&&&', '50769820700036')).toBe('entreprise-507698207')
  })

  it('retrouve le SIREN depuis l identifiant', () => {
    // C'est le SIREN qui identifie, jamais le nom : une entreprise qui change
    // de denomination ne doit pas perdre son referencement.
    expect(sirenFromSlug('bd-plomberie-507698207')).toBe('507698207')
  })

  it('rejette un identifiant sans SIREN valide', () => {
    expect(sirenFromSlug('bd-plomberie')).toBeNull()
    expect(sirenFromSlug('bd-plomberie-12345')).toBeNull()
    expect(sirenFromSlug('bd-plomberie-5076982070')).toBeNull()
  })
})
