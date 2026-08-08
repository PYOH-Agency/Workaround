import { describe, it, expect } from 'vitest'
import { activityVisibility, publiclyVisible, type CoverageInput } from '@/domain/coverage'

const NOW = new Date('2026-08-08')

const base: CoverageInput = {
  declared: [{ code: '30', requiresDecennale: true }],
  certified: [
    { code: '30', kind: 'decennale', validFrom: new Date('2026-01-01'), validUntil: new Date('2026-12-31') },
  ],
  legalStatus: 'active',
  now: NOW,
}

describe('visibilite d une activite', () => {
  it('affiche une activite couverte par la bonne assurance, en cours de validite', () => {
    expect(activityVisibility(base)).toEqual([{ code: '30', visible: true, reason: 'covered' }])
  })

  it('masque une activite declaree sans aucune attestation', () => {
    expect(activityVisibility({ ...base, certified: [] })).toEqual([
      { code: '30', visible: false, reason: 'no_certificate' },
    ])
  })

  it('masque une activite couverte par la mauvaise assurance', () => {
    // Le piege numero un du secteur : un artisan assure en RC Pro qui pose des
    // equipements engageant la decennale. Le client n'a aucun recours, et
    // personne ne le controle.
    expect(
      activityVisibility({
        ...base,
        certified: [{ ...base.certified[0], kind: 'rc_pro' }],
      }),
    ).toEqual([{ code: '30', visible: false, reason: 'wrong_insurance' }])
  })

  it('masque une activite dont l attestation a expire', () => {
    expect(activityVisibility({ ...base, now: new Date('2027-01-01') })).toEqual([
      { code: '30', visible: false, reason: 'expired' },
    ])
  })

  it('masque une activite dont l attestation ne court pas encore', () => {
    expect(activityVisibility({ ...base, now: new Date('2025-12-01') })).toEqual([
      { code: '30', visible: false, reason: 'expired' },
    ])
  })

  it('masque tout quand l entreprise est en procedure collective', () => {
    expect(activityVisibility({ ...base, legalStatus: 'blocked' })).toEqual([
      { code: '30', visible: false, reason: 'legal_block' },
    ])
  })

  it('ne se laisse pas sauver par une attestation portant une autre activite', () => {
    expect(
      activityVisibility({
        ...base,
        certified: [{ ...base.certified[0], code: '34' }],
      }),
    ).toEqual([{ code: '30', visible: false, reason: 'no_certificate' }])
  })

  it('traite chaque activite separement — la suspension est granulaire', () => {
    // C'est le point que le marche ne fait pas : une entreprise peut perdre la
    // visibilite sur une activite et la garder sur une autre.
    const result = activityVisibility({
      ...base,
      declared: [
        { code: '30', requiresDecennale: true },
        { code: '34', requiresDecennale: true },
      ],
    })

    expect(result).toEqual([
      { code: '30', visible: true, reason: 'covered' },
      { code: '34', visible: false, reason: 'no_certificate' },
    ])
  })

  it('accepte une RC Pro sur une activite qui n exige pas la decennale', () => {
    expect(
      activityVisibility({
        ...base,
        declared: [{ code: '4.1', requiresDecennale: false }],
        certified: [{ ...base.certified[0], code: '4.1', kind: 'rc_pro' }],
      }),
    ).toEqual([{ code: '4.1', visible: true, reason: 'covered' }])
  })

  it('accepte une decennale sur une activite qui n exigeait que la RC Pro', () => {
    // La decennale est plus large : refuser serait absurde.
    expect(
      activityVisibility({
        ...base,
        declared: [{ code: '4.1', requiresDecennale: false }],
        certified: [{ ...base.certified[0], code: '4.1', kind: 'decennale' }],
      }),
    ).toEqual([{ code: '4.1', visible: true, reason: 'covered' }])
  })
})

describe('presence de l entreprise dans l annuaire', () => {
  it('est publique des qu une activite est couverte', () => {
    expect(publiclyVisible(base)).toBe(true)
  })

  it("n'est pas publique si aucune activite ne l est", () => {
    // Une fiche sans aucune activite couverte ne dit rien au demandeur, et
    // affaiblit la promesse de l'annuaire.
    expect(publiclyVisible({ ...base, certified: [] })).toBe(false)
  })
})
