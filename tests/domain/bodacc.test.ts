import { describe, it, expect } from 'vitest'
import { classifyNotice, legalStatusFrom } from '@/domain/bodacc'

describe('classement des familles d avis', () => {
  it('bloque sur une procedure collective', () => {
    expect(classifyNotice('collective')).toBe('blocking')
  })

  it('bloque sur un retablissement professionnel et une radiation', () => {
    expect(classifyNotice('retablissement_professionnel')).toBe('blocking')
    expect(classifyNotice('radiation')).toBe('blocking')
  })

  it('ne bloque pas sur une conciliation', () => {
    // La conciliation est une demarche VOLONTAIRE et confidentielle de
    // prevention. Traiter un dirigeant qui anticipe ses difficultes comme un
    // dirigeant en liquidation punirait exactement le bon comportement.
    expect(classifyNotice('conciliation')).toBe('signal')
  })

  it('ignore les avis de gestion courante', () => {
    for (const family of ['creation', 'immatriculation', 'modification', 'vente', 'dpc', 'divers']) {
      expect(classifyNotice(family)).toBe('neutral')
    }
  })

  it('ignore une famille inconnue plutot que de bloquer', () => {
    // Bloquer sur l'inconnu rendrait toute evolution du BODACC capable de
    // suspendre des entreprises saines du jour au lendemain.
    expect(classifyNotice('famille_future')).toBe('neutral')
  })
})

describe('statut legal deduit', () => {
  it('est actif sans aucun avis', () => {
    expect(legalStatusFrom([])).toBe('active')
  })

  it('est bloque des qu un avis bloquant existe', () => {
    expect(legalStatusFrom(['dpc', 'collective'])).toBe('blocked')
  })

  it("reste actif si seuls des avis neutres ou des signaux existent", () => {
    expect(legalStatusFrom(['dpc', 'conciliation', 'modification'])).toBe('active')
  })
})
