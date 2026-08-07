import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { requestTimestamp } from '@/services/timestamp'

/**
 * Appelle la vraie autorite d'horodatage.
 *
 * Seul cet appel prouve que notre encodage DER est valide : un test unitaire
 * ne verifie que la coherence avec notre propre lecture de la RFC.
 *
 * A lancer avec `pnpm test:integration`.
 */
describe('autorite d horodatage (reseau)', () => {
  it('renvoie un jeton pour une empreinte valide', async () => {
    const digest = createHash('sha256').update('devis de test').digest('hex')

    const token = await requestTimestamp(digest)

    expect(token).not.toBeNull()
    const decoded = Buffer.from(token!, 'base64')
    // Une reponse RFC 3161 est une SEQUENCE DER.
    expect(decoded[0]).toBe(0x30)
    // Un jeton contenant le certificat de la TSA fait plusieurs kilo-octets.
    expect(decoded.length).toBeGreaterThan(1000)
  })
})
