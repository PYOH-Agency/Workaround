/**
 * Horodatage RFC 3161.
 *
 * Renforce la preuve de date et d'integrite de la signature : le jeton scelle
 * l'empreinte du document a un instant atteste par un tiers.
 *
 * La TSA retenue (FreeTSA) n'est **pas** un prestataire de service de confiance
 * qualifie au sens d'eIDAS. Le jeton ne cree donc aucune presomption legale — il
 * ne fait que rendre la preuve techniquement plus solide. Ne jamais le
 * presenter autrement.
 *
 * Elle n'offre par ailleurs aucun engagement de service : l'horodatage doit
 * rester **non bloquant**. Une signature sans jeton reste valable ; elle est
 * simplement moins bien etayee.
 */

const TSA_URL = process.env.TSA_URL ?? 'https://freetsa.org/tsr'

// --- Encodage DER minimal ---------------------------------------------------

function der(tag: number, content: Buffer): Buffer {
  if (content.length < 0x80) {
    return Buffer.concat([Buffer.from([tag, content.length]), content])
  }
  const lengthBytes: number[] = []
  for (let n = content.length; n > 0; n = Math.floor(n / 256)) lengthBytes.unshift(n % 256)
  return Buffer.concat([Buffer.from([tag, 0x80 | lengthBytes.length, ...lengthBytes]), content])
}

const SEQUENCE = (...parts: Buffer[]) => der(0x30, Buffer.concat(parts))
const INTEGER = (value: number) => der(0x02, Buffer.from([value]))
const OCTET_STRING = (content: Buffer) => der(0x04, content)
const BOOLEAN_TRUE = Buffer.from([0x01, 0x01, 0xff])
const NULL = Buffer.from([0x05, 0x00])

/** OID 2.16.840.1.101.3.4.2.1 — sha256. */
const SHA256_OID = Buffer.from([0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01])

/**
 * TimeStampReq ::= SEQUENCE {
 *   version        INTEGER { v1(1) },
 *   messageImprint MessageImprint,
 *   certReq        BOOLEAN DEFAULT FALSE
 * }
 */
export function buildTimestampRequest(hexDigest: string): Buffer {
  if (!/^[0-9a-f]{64}$/.test(hexDigest)) {
    throw new Error('Empreinte SHA-256 attendue (64 caracteres hexadecimaux)')
  }

  const messageImprint = SEQUENCE(
    SEQUENCE(SHA256_OID, NULL),
    OCTET_STRING(Buffer.from(hexDigest, 'hex')),
  )

  // certReq a true : sans le certificat de la TSA, le jeton ne peut pas etre
  // verifie hors ligne, ce qui lui retire tout interet probatoire.
  return SEQUENCE(INTEGER(1), messageImprint, BOOLEAN_TRUE)
}

/**
 * Demande un jeton d'horodatage. Renvoie null en cas d'echec : jamais bloquant.
 */
export async function requestTimestamp(hexDigest: string): Promise<string | null> {
  try {
    const response = await fetch(TSA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/timestamp-query',
        Accept: 'application/timestamp-reply',
      },
      body: new Uint8Array(buildTimestampRequest(hexDigest)),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return null

    const token = Buffer.from(await response.arrayBuffer())
    return token.length > 0 ? token.toString('base64') : null
  } catch {
    return null
  }
}
