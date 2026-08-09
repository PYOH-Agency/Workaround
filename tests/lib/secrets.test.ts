import { describe, it, expect, beforeAll } from 'vitest'
import { decryptSecret, encryptSecret } from '@/lib/secrets'

beforeAll(() => {
  process.env.SECRET_KEY = Buffer.alloc(32, 7).toString('base64')
})

describe('chiffrement au repos', () => {
  it('rend le secret d origine', () => {
    expect(decryptSecret(encryptSecret('jeton-de-rafraichissement'))).toBe(
      'jeton-de-rafraichissement',
    )
  })

  it('ne laisse RIEN du secret en clair', () => {
    expect(encryptSecret('jeton-de-rafraichissement')).not.toContain('jeton')
  })

  it('produit un chiffre different a chaque appel', () => {
    // Un vecteur d'initialisation fige laisserait voir que deux entreprises
    // ont le meme jeton, ou qu'un jeton n'a pas change.
    expect(encryptSecret('meme-valeur')).not.toBe(encryptSecret('meme-valeur'))
  })

  it('REFUSE un chiffre altere', () => {
    // GCM authentifie : sans cela, un octet modifie en base rendrait un jeton
    // silencieusement faux, et l'echec arriverait chez Google.
    const [iv, tag, payload] = encryptSecret('jeton').split('.')
    const flipped = Buffer.from(payload, 'base64url')
    flipped[0] ^= 0xff

    expect(() => decryptSecret(`${iv}.${tag}.${flipped.toString('base64url')}`)).toThrow()
  })

  it('refuse un secret tronque', () => {
    expect(() => decryptSecret('nimportequoi')).toThrow()
  })

  it('refuse bruyamment une cle absente', () => {
    // Se rabattre sur du clair serait la pire panne possible : silencieuse.
    const saved = process.env.SECRET_KEY
    delete process.env.SECRET_KEY

    expect(() => encryptSecret('jeton')).toThrow(/SECRET_KEY/)

    process.env.SECRET_KEY = saved
  })

  it('refuse une cle de mauvaise taille', () => {
    const saved = process.env.SECRET_KEY
    process.env.SECRET_KEY = Buffer.alloc(16, 1).toString('base64')

    expect(() => encryptSecret('jeton')).toThrow(/32 octets/)

    process.env.SECRET_KEY = saved
  })
})
