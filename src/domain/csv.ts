/**
 * Serialisation CSV, sans dependance.
 *
 * **Un CSV mal echappe ne casse pas : il ment.** Une valeur portant le
 * separateur, un guillemet ou un retour a la ligne decale les colonnes, et le
 * tableur ouvre le fichier sans rien signaler. On lit alors un chiffre faux la
 * ou une erreur aurait ete preferable — c'est ce silence qui rend le defaut
 * dangereux, pas la malformation elle-meme.
 *
 * Le separateur est le **point-virgule** : c'est celui qu'attend un tableur
 * configure en francais, et l'export est lu par nos relecteurs, pas par un
 * programme. Avec la virgule, le fichier s'ouvrirait en une seule colonne et
 * serait recolle a la main — c'est-a-dire mal.
 *
 * Les fins de ligne sont en CRLF, comme le veut la RFC 4180 : c'est ce que
 * reconnaissent les tableurs qui ouvrent un fichier sans assistant d'import.
 */
const SEPARATOR = ';'
const EOL = '\r\n'

/**
 * La virgule est protegee bien qu'elle ne soit pas le separateur : le meme
 * fichier ouvert avec des reglages anglais la lirait comme tel. Prudence
 * plutot que necessite stricte.
 */
function escape(value: string): string {
  if (!/[";,\n\r]/.test(value)) return value
  return `"${value.replaceAll('"', '""')}"`
}

export function toCsv(headers: string[], rows: string[][]): string {
  const line = (cells: string[]) => cells.map(escape).join(SEPARATOR) + EOL
  return line(headers) + rows.map(line).join('')
}
