import { describe, it, expect } from 'vitest'
import {
  documentHash,
  buildProof,
  generateCode,
  hashCode,
  verifyCode,
  MAX_ATTEMPTS,
  type Proof,
} from '@/services/signature'

const validProof: Proof = {
  signerName: 'Paul Martin',
  signerEmail: 'paul@example.com',
  signerPhone: '+33612345678',
  codeValidatedAt: new Date('2026-08-08T10:00:00Z'),
  ipAddress: '1.2.3.4',
  userAgent: 'Mozilla/5.0',
  documentHash: 'a'.repeat(64),
  archivedPdfPath: 'signatures/quote-1.pdf',
}

describe('empreinte du document', () => {
  it('produit une empreinte SHA-256 stable', () => {
    const buffer = Buffer.from('contenu du devis')
    expect(documentHash(buffer)).toBe(documentHash(Buffer.from('contenu du devis')))
    expect(documentHash(buffer)).toHaveLength(64)
  })

  it('change d empreinte si le document change d un octet', () => {
    expect(documentHash(Buffer.from('devis A'))).not.toBe(documentHash(Buffer.from('devis B')))
  })
})

describe('constitution de la preuve', () => {
  it('accepte une preuve complete', () => {
    expect(buildProof(validProof).signerName).toBe('Paul Martin')
  })

  it('coupe les espaces autour du nom', () => {
    expect(buildProof({ ...validProof, signerName: '  Paul Martin  ' }).signerName).toBe(
      'Paul Martin',
    )
  })

  it('refuse une preuve sans nom de signataire', () => {
    expect(() => buildProof({ ...validProof, signerName: '  ' })).toThrow('nom du signataire')
  })

  it('refuse une adresse e-mail invalide', () => {
    expect(() => buildProof({ ...validProof, signerEmail: 'pas-un-email' })).toThrow('e-mail')
  })

  it("refuse une preuve sans code SMS valide — l'identification manquerait", () => {
    expect(() =>
      buildProof({ ...validProof, codeValidatedAt: null as unknown as Date }),
    ).toThrow('code SMS')
  })

  it("refuse une preuve sans PDF archive — l'integrite ne serait pas prouvable", () => {
    expect(() => buildProof({ ...validProof, archivedPdfPath: '' })).toThrow('PDF archive')
  })

  it('refuse une empreinte de document malformee', () => {
    expect(() => buildProof({ ...validProof, documentHash: 'trop-court' })).toThrow('Empreinte')
  })
})

describe('code a usage unique', () => {
  it('genere un code numerique a six chiffres', () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^\d{6}$/)
  })

  it('ne stocke jamais le code en clair', () => {
    const hashed = hashCode('123456')
    expect(hashed).not.toContain('123456')
    expect(hashed).toHaveLength(64)
  })

  it('accepte le bon code avant expiration', () => {
    const state = { codeHash: hashCode('123456'), expiresAt: new Date(Date.now() + 60_000), attempts: 0 }
    expect(verifyCode(state, '123456')).toBe(true)
  })

  it('renvoie faux sur un mauvais code', () => {
    const state = { codeHash: hashCode('123456'), expiresAt: new Date(Date.now() + 60_000), attempts: 0 }
    expect(verifyCode(state, '000000')).toBe(false)
  })

  it('refuse un code expire', () => {
    const state = { codeHash: hashCode('123456'), expiresAt: new Date(Date.now() - 1), attempts: 0 }
    expect(() => verifyCode(state, '123456')).toThrow('expire')
  })

  it('refuse au-dela du nombre de tentatives', () => {
    const state = {
      codeHash: hashCode('123456'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: MAX_ATTEMPTS,
    }
    expect(() => verifyCode(state, '123456')).toThrow('Trop de tentatives')
  })
})
