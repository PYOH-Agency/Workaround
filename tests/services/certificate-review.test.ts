import { describe, it, expect } from 'vitest'
import { assertReviewable, type ReviewableCertificate } from '@/services/certificate-review'

const pending: ReviewableCertificate = {
  status: 'pending',
  validFrom: new Date('2026-01-01'),
  validUntil: new Date('2026-12-31'),
  activityCodes: ['30'],
}

describe('conditions de validation d une attestation', () => {
  it('accepte un dossier complet', () => {
    expect(() => assertReviewable(pending)).not.toThrow()
  })

  it('refuse une validation sans aucune activite rattachee', () => {
    // Une attestation validee sans activite ne couvre rien : elle donnerait a
    // l'artisan le sentiment d'etre verifie sans rien rendre visible.
    expect(() => assertReviewable({ ...pending, activityCodes: [] })).toThrow('activité')
  })

  it('refuse une validation sans dates de validite', () => {
    expect(() => assertReviewable({ ...pending, validUntil: null })).toThrow('validité')
  })

  it('refuse une periode de validite inversee', () => {
    expect(() => assertReviewable({ ...pending, validUntil: new Date('2025-01-01') })).toThrow(
      'validité',
    )
  })

  it('refuse de revalider une attestation deja traitee', () => {
    // La revue est un acte trace : la rejouer effacerait qui a decide quoi.
    expect(() => assertReviewable({ ...pending, status: 'validated' })).toThrow('déjà')
    expect(() => assertReviewable({ ...pending, status: 'rejected' })).toThrow('déjà')
  })

  it('refuse deux fois la meme activite sur une attestation', () => {
    // La contrainte d'unicite en base l'interdit de toute facon : la signaler
    // ici donne un message comprehensible au relecteur plutot qu'une erreur SQL.
    expect(() => assertReviewable({ ...pending, activityCodes: ['30', '30'] })).toThrow('deux fois')
  })
})
