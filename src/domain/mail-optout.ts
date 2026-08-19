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

/**
 * Un secret vide n'est pas une variante degradee : HMAC accepte une cle vide,
 * et l'algorithme est public, donc n'importe qui recalculerait le jeton. Les
 * adresses d'artisans sont publiques par nature — un secret absent en
 * production ouvrirait un desabonnement de masse, irreversible.
 *
 * On leve ici plutot que de renvoyer un jeton inutile : mieux vaut casser
 * l'envoi du mail que laisser partir un lien qui a l'air valide.
 */
export function optoutToken(email: string, secret: string): string {
  if (!secret) throw new Error('MAIL_OPTOUT_SECRET manquant : impossible de signer le lien')
  return createHmac('sha256', secret).update(normalize(email)).digest('hex')
}

export function verifyOptout(
  email: string | undefined,
  token: string | undefined,
  secret: string,
): boolean {
  // Meme cause qu'au-dessus (secret absent), mais consequence differente :
  // ici c'est une page « lien invalide » pour l'artisan, jamais une erreur —
  // on ne peut pas deleguer a optoutToken, qui leve desormais.
  if (!secret || !email || !token) return false

  const expected = Buffer.from(optoutToken(email, secret))
  // Un lien recopie a la main peut changer de casse sans changer de jeton :
  // le hex reste le meme nombre, majuscules ou non.
  const given = Buffer.from(token.toLowerCase())

  // Comparaison a temps constant : une comparaison naive laisse deviner le
  // jeton octet par octet.
  if (expected.length !== given.length) return false
  return timingSafeEqual(expected, given)
}
