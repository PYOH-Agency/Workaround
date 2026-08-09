import type { Anomaly } from '../anomaly'

/**
 * Trois clients, pas deux : un meme particulier saisi deux fois sous deux
 * fiches est un accident de saisie courant. Trois est difficile a expliquer.
 */
const DISTINCT_CUSTOMERS_LIMIT = 3

export interface SignatureRecord {
  companyId: string
  companyName: string
  customerId: string
  signerPhone: string
  signedAt: Date
}

/** Les chiffres seuls : « 06 12 34 56 78 » et « +33612345678 » designent le meme numero. */
const digitsOnly = (phone: string) => phone.replace(/\D/g, '').slice(-9)

/**
 * Plusieurs clients d'une meme entreprise ayant signe avec le meme telephone.
 *
 * **Pourquoi pas l'adresse IP.** Le parcours parfaitement legitime — l'artisan
 * est chez son client, qui signe depuis le meme reseau — produit exactement
 * cette signature. Le taux de faux positifs rendrait le detecteur ignore, et un
 * detecteur ignore ne detecte rien.
 *
 * Le code SMS, lui, part vers un numero : le meme pour trois clients differents
 * ne s'explique pas par une visite a domicile.
 *
 * Classe `signal` : il designe un dossier a regarder, jamais une sanction.
 */
export function detectSharedSigners(signatures: SignatureRecord[]): Anomaly[] {
  const groups = new Map<
    string,
    { companyId: string; companyName: string; customers: Set<string>; since: Date }
  >()

  for (const record of signatures) {
    const phone = digitsOnly(record.signerPhone)
    if (!phone) continue

    const key = `${record.companyId} ${phone}`
    const group = groups.get(key) ?? {
      companyId: record.companyId,
      companyName: record.companyName,
      customers: new Set<string>(),
      since: record.signedAt,
    }

    group.customers.add(record.customerId)
    if (record.signedAt < group.since) group.since = record.signedAt
    groups.set(key, group)
  }

  return [...groups.values()]
    .filter((g) => g.customers.size >= DISTINCT_CUSTOMERS_LIMIT)
    .map((g) => ({
      type: 'shared_signer' as const,
      severity: 'signal' as const,
      subjectId: g.companyId,
      since: g.since,
      detail: `${g.customers.size} clients de ${g.companyName} ont signé avec le même numéro`,
      href: '/supervision',
      // Trie : l'empreinte ne doit pas dependre de l'ordre de lecture.
      fingerprint: [...g.customers].sort().join('|'),
    }))
}
