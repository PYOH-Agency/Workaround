/**
 * Normalisation des numeros de telephone francais.
 *
 * Les operateurs SMS attendent un format international sans indicatif de
 * sortie ni signe plus. L'artisan, lui, saisit ce qu'il a sous les yeux :
 * « 06 12 34 56 78 », « +33 6 12 34 56 78 » ou « 06.12.34.56.78 ».
 */

/** Un code SMS envoye sur un fixe n'arrivera jamais : autant le refuser tot. */
const FRENCH_MOBILE = /^33[67]\d{8}$/

export function toInternational(input: string): string {
  const digits = input.replace(/[\s.\-()]/g, '').replace(/^\+/, '')

  const national = digits.startsWith('0033')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? `33${digits.slice(1)}`
      : digits

  if (national.length !== 11) throw new Error(`Numero de telephone invalide : ${input}`)
  if (!FRENCH_MOBILE.test(national)) {
    throw new Error(`Un numero mobile est requis pour recevoir un code : ${input}`)
  }

  return national
}
