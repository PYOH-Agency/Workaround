import { describe, expect, it } from 'vitest'
import { optoutToken, verifyOptout } from '@/domain/mail-optout'

const SECRET = 'secret-de-test'

describe('jeton d opposition', () => {
  it('reconnait son propre jeton', () => {
    const token = optoutToken('artisan@exemple.fr', SECRET)
    expect(verifyOptout('artisan@exemple.fr', token, SECRET)).toBe(true)
  })

  it('refuse un jeton forge', () => {
    expect(verifyOptout('artisan@exemple.fr', 'nimportequoi', SECRET)).toBe(false)
  })

  it('refuse le jeton d une autre adresse', () => {
    const token = optoutToken('autre@exemple.fr', SECRET)
    expect(verifyOptout('artisan@exemple.fr', token, SECRET)).toBe(false)
  })

  it('ignore la casse et les espaces de l adresse', () => {
    // L'adresse revient par une URL : elle peut avoir ete recopiee autrement.
    const token = optoutToken('artisan@exemple.fr', SECRET)
    expect(verifyOptout('  Artisan@Exemple.FR ', token, SECRET)).toBe(true)
  })

  it('refuse un jeton de la bonne longueur mais faux', () => {
    const token = optoutToken('artisan@exemple.fr', SECRET)
    const forged = token.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))
    expect(verifyOptout('artisan@exemple.fr', forged, SECRET)).toBe(false)
  })

  it('refuse un jeton signe avec un autre secret', () => {
    // Propriete de securite du dispositif : sans elle, rien ne prouve que le
    // secret entre reellement dans la signature.
    const token = optoutToken('artisan@exemple.fr', 'autre-secret')
    expect(verifyOptout('artisan@exemple.fr', token, SECRET)).toBe(false)
  })

  it('renvoie false plutot que de lever sur une adresse ou un jeton vide', () => {
    // Le parametre vient d'une URL, ou il peut manquer : un lien tronque doit
    // donner « lien invalide », jamais une page en erreur.
    const token = optoutToken('artisan@exemple.fr', SECRET)
    expect(() => verifyOptout('', token, SECRET)).not.toThrow()
    expect(verifyOptout('', token, SECRET)).toBe(false)
    expect(() => verifyOptout('artisan@exemple.fr', '', SECRET)).not.toThrow()
    expect(verifyOptout('artisan@exemple.fr', '', SECRET)).toBe(false)
  })

  it('renvoie false plutot que de lever sur une adresse ou un jeton absent', () => {
    // Une URL /stop?e=... sans &s= donne undefined dans searchParams, pas ''.
    const token = optoutToken('artisan@exemple.fr', SECRET)
    expect(() => verifyOptout(undefined, token, SECRET)).not.toThrow()
    expect(verifyOptout(undefined, token, SECRET)).toBe(false)
    expect(() => verifyOptout('artisan@exemple.fr', undefined, SECRET)).not.toThrow()
    expect(verifyOptout('artisan@exemple.fr', undefined, SECRET)).toBe(false)
    expect(() => verifyOptout(undefined, undefined, SECRET)).not.toThrow()
    expect(verifyOptout(undefined, undefined, SECRET)).toBe(false)
  })

  it('refuse de signer sans secret', () => {
    // HMAC accepte une cle vide et l'algorithme est public : un secret vide
    // rendrait le jeton forgeable par n'importe qui. Mieux vaut casser
    // l'envoi du mail que laisser partir un lien inutile.
    expect(() => optoutToken('artisan@exemple.fr', '')).toThrow()
  })

  it('refuse tout jeton quand le secret est vide', () => {
    // Meme cause que ci-dessus, mais ici la consequence doit rester une page
    // « lien invalide » pour l'artisan, jamais une exception.
    expect(() => verifyOptout('artisan@exemple.fr', 'nimportequoi', '')).not.toThrow()
    expect(verifyOptout('artisan@exemple.fr', 'nimportequoi', '')).toBe(false)
  })

  it('ignore la casse du jeton recopie a la main', () => {
    const token = optoutToken('artisan@exemple.fr', SECRET)
    expect(verifyOptout('artisan@exemple.fr', token.toUpperCase(), SECRET)).toBe(true)
  })
})
