import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Le jeton du lien « je ne souhaite plus etre contacte ».
 *
 * Signe plutot que stocke : la demande qui a declenche le mail est anonymisee a
 * 30 jours, un jeton range dans cette ligne mourrait avec elle — et le lien
 * d'un vieux mail cesserait de fonctionner, ce qui reviendrait a retirer le
 * droit d'opposition avec le temps.
 *
 * L'adresse est normalisee avant signature : elle revient par une URL, ou elle
 * a pu etre recopiee dans une autre casse.
 *
 * Cette normalisation est locale plutot que reprise de `normalizeEmail` :
 * celle-ci LEVE sur une adresse vide, ce qui est juste a l'inscription mais
 * faux ici — le parametre vient d'une URL, ou il peut manquer, et un lien
 * tronque doit donner « lien invalide », pas une page en erreur.
 */
function normalize(email: string): string {
  return email.trim().toLowerCase()
}

export function optoutToken(email: string, secret: string): string {
  return createHmac('sha256', secret).update(normalize(email)).digest('hex')
}

export function verifyOptout(email: string, token: string, secret: string): boolean {
  const expected = Buffer.from(optoutToken(email, secret))
  const given = Buffer.from(token)

  // Comparaison a temps constant : une comparaison naive laisse deviner le
  // jeton octet par octet.
  if (expected.length !== given.length) return false
  return timingSafeEqual(expected, given)
}
