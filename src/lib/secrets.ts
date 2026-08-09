import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Chiffrement des secrets au repos.
 *
 * Le seul secret que le produit conserve est un jeton de rafraichissement
 * d'agenda externe. Il est etroit — il n'ouvre que les creneaux occupes — et
 * revocable chez son fournisseur ; il n'a pas a etre lisible en base pour
 * autant.
 *
 * **AES-256-GCM**, donc authentifie : un octet modifie en base est detecte au
 * dechiffrement, plutot que de produire un jeton silencieusement faux dont
 * l'echec arriverait chez Google.
 */
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

/**
 * La cle, hors depot.
 *
 * **Aucun repli sur du clair.** Se rabattre serait la pire panne possible,
 * parce que silencieuse : on decouvrirait des jetons en clair le jour ou l'on
 * regarderait la base.
 */
function key(): Buffer {
  const raw = process.env.SECRET_KEY
  if (!raw) throw new Error('SECRET_KEY est absente : impossible de chiffrer un secret')

  const bytes = Buffer.from(raw, 'base64')
  if (bytes.length !== 32) throw new Error('SECRET_KEY doit faire 32 octets en base64')

  return bytes
}

/** Format : `iv.tag.chiffre`, chaque partie en base64url. */
export function encryptSecret(value: string): string {
  // Un vecteur d'initialisation NEUF a chaque appel : fige, il laisserait voir
  // que deux entreprises ont le meme jeton, ou qu'un jeton n'a pas change.
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key(), iv)

  const sealed = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])

  return [iv, cipher.getAuthTag(), sealed].map((part) => part.toString('base64url')).join('.')
}

export function decryptSecret(sealed: string): string {
  const [iv, tag, payload] = sealed.split('.').map((part) => Buffer.from(part, 'base64url'))
  if (!iv || !tag || !payload) throw new Error('Secret chiffré illisible')

  const decipher = createDecipheriv(ALGORITHM, key(), iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8')
}
