import { describe, it, expect } from 'vitest'
import { normalizeEmail, resolveDestination } from '@/domain/requester'

describe('normalisation de l adresse', () => {
  it('met en minuscules et retire les espaces', () => {
    // Sans cela, deux comptes pour une personne — et le second ne verrait
    // jamais le chantier du premier.
    expect(normalizeEmail('  Paul.Martin@Test.FR ')).toBe('paul.martin@test.fr')
  })

  it('refuse une adresse vide', () => {
    expect(() => normalizeEmail('   ')).toThrow(/adresse/i)
  })
})

describe('destination apres connexion', () => {
  it('envoie l artisan dans son atelier', () => {
    expect(resolveDestination({ hasCompany: true, hasRequester: false })).toBe('/devis')
  })

  it('envoie le demandeur chez lui', () => {
    // Le defaut d'aujourd'hui : SessionError puis /inscription, c'est-a-dire
    // le formulaire SIRET de l'artisan.
    expect(resolveDestination({ hasCompany: false, hasRequester: true })).toBe('/mes-logements')
  })

  it('fait primer l entreprise quand le compte porte les deux roles', () => {
    // Un plombier fait aussi refaire sa toiture. Interdire le cumul serait
    // faux ; ne pas choisir de defaut le laisserait sans destination.
    expect(resolveDestination({ hasCompany: true, hasRequester: true })).toBe('/devis')
  })

  it('envoie a l inscription un compte qui n est ni l un ni l autre', () => {
    expect(resolveDestination({ hasCompany: false, hasRequester: false })).toBe('/inscription')
  })
})
