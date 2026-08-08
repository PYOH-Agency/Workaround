import { describe, it, expect } from 'vitest'
import { detectSharedSigners, type SignatureRecord } from '@/domain/detectors/signers'

const signature = (customerId: string, phone: string, companyId = 'c1'): SignatureRecord => ({
  companyId,
  companyName: 'PLOMBERIE DU TEST',
  customerId,
  signerPhone: phone,
  signedAt: new Date('2026-08-01'),
})

describe('signataire partage', () => {
  it('ne signale rien pour deux clients', () => {
    // Un meme particulier saisi deux fois sous deux fiches est un accident de
    // saisie courant. Deux n'accuse personne.
    const found = detectSharedSigners([
      signature('cli-1', '0612345678'),
      signature('cli-2', '0612345678'),
    ])
    expect(found).toEqual([])
  })

  it('signale a partir de trois clients distincts', () => {
    const found = detectSharedSigners([
      signature('cli-1', '0612345678'),
      signature('cli-2', '0612345678'),
      signature('cli-3', '0612345678'),
    ])

    expect(found).toHaveLength(1)
    // Un signal, jamais une sanction : il designe un dossier a regarder.
    expect(found[0].severity).toBe('signal')
    expect(found[0].subjectId).toBe('c1')
  })

  it('ne compte qu une fois un client qui signe plusieurs devis', () => {
    // Un client fidele n'est pas une fraude.
    const found = detectSharedSigners([
      signature('cli-1', '0612345678'),
      signature('cli-1', '0612345678'),
      signature('cli-1', '0612345678'),
    ])
    expect(found).toEqual([])
  })

  it('ne melange pas deux entreprises', () => {
    const found = detectSharedSigners([
      signature('cli-1', '0612345678', 'c1'),
      signature('cli-2', '0612345678', 'c2'),
      signature('cli-3', '0612345678', 'c1'),
    ])
    expect(found).toEqual([])
  })

  it('rapproche les numeros ecrits differemment', () => {
    const found = detectSharedSigners([
      signature('cli-1', '06 12 34 56 78'),
      signature('cli-2', '+33612345678'),
      signature('cli-3', '0612345678'),
    ])
    expect(found).toHaveLength(1)
  })

  it('produit une empreinte stable, independante de l ordre', () => {
    // C'est elle qui decide si un examen passe masque encore l'anomalie.
    const a = detectSharedSigners([
      signature('cli-3', '0612345678'),
      signature('cli-1', '0612345678'),
      signature('cli-2', '0612345678'),
    ])
    const b = detectSharedSigners([
      signature('cli-1', '0612345678'),
      signature('cli-2', '0612345678'),
      signature('cli-3', '0612345678'),
    ])

    expect(a[0].fingerprint).toBe(b[0].fingerprint)
  })
})
