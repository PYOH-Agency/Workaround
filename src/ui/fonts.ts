import localFont from 'next/font/local'

/**
 * Trois familles, chacune un seul emploi, et aucune requete au build.
 *
 * **Les fichiers sont dans le depot.** `next/font/google` les servait deja
 * depuis notre domaine — le cadrage RGPD etait respecte — mais il les
 * TELECHARGEAIT a la construction. Un build sans reseau, derriere un proxy ou
 * dans un CI isole echoue alors sur une police, et le message ne dit pas que
 * c'est le reseau qui manque. Ce n'est pas un risque theorique : la panne est
 * arrivee des l'ajout de Bricolage, la seule des trois qui n'etait encore dans
 * le cache de personne.
 *
 * Trois `woff2` en sous-ensemble latin, 194 Ko en tout — moins que ce que le
 * chargeur Google servait, qui livrait Inter en trois graisses statiques.
 *
 * **Deux depots de fontes, et c'est voulu.** Ici des `woff2`, que seul un
 * navigateur sait lire. Dans `src/pdf/fonts`, des `ttf` : ni `@react-pdf`
 * (le PDF) ni Satori (les images de partage) ne decompressent le woff2. Un
 * format unique obligerait les deux autres a embarquer un decompresseur pour
 * economiser un dossier.
 *
 * Les trois familles sont sous licence OFL 1.1 — voir `typefaces/LICENSE.md`.
 */

/**
 * Titrage. Grotesque variable, un peu de guingois — les fins de fut coupees en
 * biais, les jambages courts, une chasse qui se resserre quand le corps grandit.
 *
 * Archivo tenait ce role et le tenait honnetement : industriel, large, solide.
 * Trop honnete. A 100 px il n'avait rien a dire de plus qu'a 32 — d'ou des
 * accroches qui paraissaient etre des titres de formulaire agrandis.
 *
 * Le fichier porte ses axes `opsz`, `wdth` et `wght` : c'est ce qui permet a
 * `Heading` de descendre la chasse a 92 sur les grands corps. Une instance
 * figee ne le pourrait pas — et c'est bien celle que prennent les images de
 * partage, faute de mieux (voir `opengraph-image.tsx`).
 *
 * Son nom n'est pas pour rien dans le choix : la police du bricolage sur le
 * produit du batiment. On ne l'ecrira nulle part, et c'est tres bien ainsi.
 */
export const bricolage = localFont({
  src: './typefaces/BricolageGrotesque-Variable-latin.woff2',
  variable: '--font-bricolage',
  weight: '200 800',
  display: 'swap',
})

/**
 * Le logotype, et lui seul.
 *
 * La marque ne suit pas les changements de charte : c'est ce qui en fait une
 * marque. « d'equerre » reste en Archivo 800 sur l'ecran comme sur le PDF et
 * sur les images de partage. Un seul poids, donc 14 Ko.
 */
export const archivo = localFont({
  src: './typefaces/Archivo-ExtraBold-latin.woff2',
  variable: '--font-archivo',
  weight: '800',
  display: 'swap',
})

/** Corps et donnees. Neutre, lisible en tableau. */
export const inter = localFont({
  src: './typefaces/Inter-Variable-latin.woff2',
  variable: '--font-inter',
  weight: '400 600',
  display: 'swap',
})
