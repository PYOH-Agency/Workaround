import { describe, it, expect } from 'vitest'
import { buildTimestampRequest } from '@/services/timestamp'

const HASH = 'a3f5'.repeat(16) // 64 caracteres hexadecimaux = 32 octets

describe('requete d horodatage RFC 3161', () => {
  it('produit une SEQUENCE DER', () => {
    const request = buildTimestampRequest(HASH)
    expect(request[0]).toBe(0x30) // SEQUENCE
  })

  it('annonce une longueur coherente avec le contenu', () => {
    const request = buildTimestampRequest(HASH)
    // Longueur courte (< 128) codee sur un octet.
    expect(request[1]).toBe(request.length - 2)
  })

  it("contient l'OID de SHA-256", () => {
    const request = buildTimestampRequest(HASH)
    const sha256Oid = Buffer.from([0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01])
    expect(request.includes(sha256Oid)).toBe(true)
  })

  it("embarque l'empreinte telle quelle, dans une OCTET STRING de 32 octets", () => {
    const request = buildTimestampRequest(HASH)
    const digest = Buffer.from(HASH, 'hex')
    expect(request.includes(Buffer.concat([Buffer.from([0x04, 0x20]), digest]))).toBe(true)
  })

  it('demande le certificat de la TSA, sans quoi le jeton est invérifiable', () => {
    const request = buildTimestampRequest(HASH)
    // BOOLEAN TRUE en DER.
    expect(request.includes(Buffer.from([0x01, 0x01, 0xff]))).toBe(true)
  })

  it('refuse une empreinte qui n est pas du SHA-256', () => {
    expect(() => buildTimestampRequest('trop-court')).toThrow('SHA-256')
  })
})
