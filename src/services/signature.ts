import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

/**
 * Piste d'audit de la signature electronique.
 *
 * En signature simple, la presomption de fiabilite de l'article 1367 alinea 2
 * du Code civil ne s'applique pas : elle est reservee a la signature qualifiee.
 * La charge de la preuve pese donc sur celui qui s'en prevaut, et il doit
 * etablir **separement** trois elements :
 *
 *   - l'integrite de l'acte      -> empreinte du PDF + archivage de ce PDF
 *   - l'identification du signataire -> lien e-mail + code a usage unique par SMS
 *   - le lien signature <-> acte -> empreinte scellee dans un jeton d'horodatage
 *
 * Voir docs/superpowers/research/2026-08-07-signature-electronique.md.
 *
 * Ne jamais qualifier cette signature d'« avancee » : le niveau avance au sens
 * d'eIDAS suppose un controle exclusif du dispositif par le signataire, qu'un
 * lien e-mail ne procure pas.
 */

export function documentHash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

export interface Proof {
  signerName: string
  signerEmail: string
  signerPhone: string
  /** Identification : horodatage de la validation du code SMS. */
  codeValidatedAt: Date
  ipAddress: string
  userAgent: string
  documentHash: string
  /** Integrite : chemin du PDF exact soumis a la signature. */
  archivedPdfPath: string
}

export function buildProof(input: Proof): Proof {
  if (!input.signerName.trim()) throw new Error('Le nom du signataire est obligatoire')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.signerEmail)) {
    throw new Error('Adresse e-mail du signataire invalide')
  }
  if (!/^[0-9a-f]{64}$/.test(input.documentHash)) throw new Error('Empreinte de document invalide')
  if (!input.codeValidatedAt) throw new Error('Le code SMS doit avoir ete valide avant la signature')
  if (!input.archivedPdfPath) throw new Error('Le PDF archive est obligatoire')

  return { ...input, signerName: input.signerName.trim() }
}

// --- Code a usage unique ----------------------------------------------------

export const MAX_ATTEMPTS = 3
export const CODE_TTL_MS = 10 * 60 * 1000

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Le code n'est jamais stocke en clair, pas meme en base de developpement. */
export function hashCode(code: string): string {
  return createHash('sha256')
    .update(`${process.env.SMS_CODE_SALT ?? ''}${code}`)
    .digest('hex')
}

export interface CodeState {
  codeHash: string
  expiresAt: Date
  attempts: number
}

export function verifyCode(state: CodeState, submitted: string): boolean {
  if (state.attempts >= MAX_ATTEMPTS) throw new Error('Trop de tentatives')
  if (state.expiresAt.getTime() <= Date.now()) throw new Error('Ce code a expire')

  const expected = Buffer.from(state.codeHash, 'hex')
  const provided = Buffer.from(hashCode(submitted), 'hex')

  // Comparaison a temps constant : une comparaison naive fuirait le code par
  // le temps de reponse.
  return expected.length === provided.length && timingSafeEqual(expected, provided)
}
