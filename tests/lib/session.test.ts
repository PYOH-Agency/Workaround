import { describe, it, expect } from 'vitest'
import { SessionError, resolveCompany } from '@/lib/session'

describe('resolveCompany', () => {
  it('rejette une session sans utilisateur', () => {
    expect(() => resolveCompany(null, null)).toThrow(SessionError)
  })

  it('rejette un utilisateur sans entreprise rattachee', () => {
    expect(() => resolveCompany({ id: 'u1', email: 'a@b.fr' }, null)).toThrow('Aucune entreprise')
  })

  it('renvoie l identifiant d entreprise et le role', () => {
    expect(resolveCompany({ id: 'u1', email: 'a@b.fr' }, { companyId: 'c1', role: 'owner' })).toEqual(
      { userId: 'u1', email: 'a@b.fr', companyId: 'c1', role: 'owner' },
    )
  })

  it('distingue les deux causes de rejet, pour que l appelant puisse orienter', () => {
    // Sans utilisateur : il faut se connecter.
    expect(() => resolveCompany(null, null)).toThrow('Session expiree')
    // Utilisateur connu mais sans entreprise : il faut finir l'inscription.
    expect(() => resolveCompany({ id: 'u1', email: 'a@b.fr' }, null)).toThrow('Aucune entreprise')
  })
})
