import { describe, it, expect } from 'vitest'
import { ErreurSession, resoudreEntreprise } from '@/lib/session'

describe('resoudreEntreprise', () => {
  it('rejette une session sans utilisateur', () => {
    expect(() => resoudreEntreprise(null, null)).toThrow(ErreurSession)
  })

  it('rejette un utilisateur sans entreprise rattachee', () => {
    expect(() => resoudreEntreprise({ id: 'u1', email: 'a@b.fr' }, null)).toThrow('Aucune entreprise')
  })

  it('renvoie l identifiant d entreprise et le role', () => {
    const r = resoudreEntreprise(
      { id: 'u1', email: 'a@b.fr' },
      { entrepriseId: 'e1', role: 'proprietaire' },
    )
    expect(r).toEqual({
      utilisateurId: 'u1',
      email: 'a@b.fr',
      entrepriseId: 'e1',
      role: 'proprietaire',
    })
  })

  it('distingue les deux causes de rejet, pour que l appelant puisse orienter', () => {
    // Sans utilisateur : il faut se connecter.
    expect(() => resoudreEntreprise(null, null)).toThrow('Session expiree')
    // Utilisateur connu mais sans entreprise : il faut finir l'inscription.
    expect(() => resoudreEntreprise({ id: 'u1', email: 'a@b.fr' }, null)).toThrow('Aucune entreprise')
  })
})
