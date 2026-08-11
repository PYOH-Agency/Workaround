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

describe('resolveDestination', () => {
  const NOBODY = {
    hasCompany: false,
    hasRequester: false,
    hasSignature: false,
    hasStaff: false,
  }

  it('envoie l artisan sur son accueil, et non sur sa liste de devis', () => {
    // La liste des devis faisait office d'accueil faute d'accueil. Elle redevient
    // ce qu'elle est.
    expect(resolveDestination({ ...NOBODY, hasCompany: true })).toBe('/')
  })

  it('envoie aux logements un demandeur qui a signe', () => {
    expect(resolveDestination({ ...NOBODY, hasRequester: true, hasSignature: true })).toBe(
      '/mes-logements',
    )
  })

  it('envoie au repertoire un demandeur qui n a jamais signe', () => {
    // Sinon il atterrit sur un ecran vide que sa requete ne peut pas remplir :
    // `myProperties` derive les logements DES SIGNATURES.
    expect(resolveDestination({ ...NOBODY, hasRequester: true, hasSignature: false })).toBe(
      '/mon-repertoire',
    )
  })

  it('envoie a la supervision un relecteur interne', () => {
    expect(resolveDestination({ ...NOBODY, hasStaff: true })).toBe('/supervision')
  })

  it('fait passer l entreprise AVANT le back-office', () => {
    // L'exploitant du produit est justement le compte qui porte les deux.
    // L'atelier est celui ou l'on travaille tous les jours ; l'en-tete propose
    // le passage a l'autre cote.
    expect(resolveDestination({ ...NOBODY, hasCompany: true, hasStaff: true })).toBe('/')
  })

  it('fait passer l entreprise AVANT le dossier de demandeur', () => {
    // Un plombier fait aussi refaire sa toiture. Interdire le cumul serait
    // faux ; ne pas choisir de defaut le laisserait sans destination.
    expect(
      resolveDestination({ ...NOBODY, hasCompany: true, hasRequester: true, hasSignature: true }),
    ).toBe('/')
  })

  it('envoie a l inscription artisan un compte sans aucun rattachement', () => {
    expect(resolveDestination(NOBODY)).toBe('/creer-mon-entreprise')
  })
})
