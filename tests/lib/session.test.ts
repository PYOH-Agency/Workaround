import { describe, it, expect } from 'vitest'
import { SessionError, resolveCompany, resolveRequester } from '@/lib/session'

const USER = { id: 'u1', email: 'a@b.fr' }

describe('resolveCompany', () => {
  it('rejette une session sans utilisateur', () => {
    expect(() => resolveCompany(null, null)).toThrow(SessionError)
  })

  it('rejette un utilisateur sans entreprise rattachee', () => {
    expect(() => resolveCompany(USER, null)).toThrow('Aucune entreprise')
  })

  it('renvoie le role ET le plan', () => {
    // La session est ce que lisent la garde et la navigation : si le plan n'y
    // est pas, chaque ecran devra aller le chercher — et l'un d'eux oubliera.
    expect(resolveCompany(USER, { companyId: 'c1', role: 'owner', plan: 'pro' })).toEqual({
      userId: 'u1',
      email: 'a@b.fr',
      companyId: 'c1',
      role: 'owner',
      plan: 'pro',
    })
  })

  it('distingue les deux causes de rejet, pour que l appelant puisse orienter', () => {
    // Sans utilisateur : il faut se connecter.
    expect(() => resolveCompany(null, null)).toThrow('Session expiree')
    // Utilisateur connu mais sans entreprise : il faut finir l'inscription.
    expect(() => resolveCompany(USER, null)).toThrow('Aucune entreprise')
  })
})

describe('resolveRequester', () => {
  it('rejette une session sans utilisateur', () => {
    expect(() => resolveRequester(null, null)).toThrow('Session expiree')
  })

  it('rejette un compte sans dossier', () => {
    // Message distinct : l'appelant doit pouvoir orienter autrement que vers
    // l'inscription artisan — ce compte n'est pas un artisan qui n'aurait pas
    // fini, c'est quelqu'un qui n'a rien signe.
    expect(() => resolveRequester({ id: 'u1', email: 'a@b.fr' }, null)).toThrow('Aucun dossier')
  })

  it('renvoie l identifiant du dossier', () => {
    expect(resolveRequester({ id: 'u1', email: 'a@b.fr' }, { requesterId: 'r1' })).toEqual({
      userId: 'u1',
      email: 'a@b.fr',
      requesterId: 'r1',
    })
  })
})
