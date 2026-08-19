import { Archivo, Bricolage_Grotesque, Inter } from 'next/font/google'

/**
 * Trois familles, et chacune a un seul emploi.
 *
 * `next/font/google` telecharge et sert les fichiers depuis notre domaine :
 * aucune requete vers Google au chargement. C'est un gain de performance, et
 * surtout une exigence du cadrage RGPD.
 */

/**
 * Titrage. Grotesque variable, un peu de guingois — les fins de fut coupees en
 * biais, les jambages courts, une chasse qui se resserre quand le corps grandit.
 *
 * Archivo tenait ce role et le tenait honnetement : industriel, large, solide.
 * Trop honnete. A 100 px il n'avait rien a dire de plus qu'a 32 — d'ou des
 * accroches qui paraissaient etre des titres de formulaire agrandis, et deux
 * pages d'entree qui se lisaient comme un document administratif soigne.
 *
 * Bricolage porte un axe optique (`opsz`) et un axe de chasse (`wdth`) : la
 * meme famille se resserre et durcit ses angles a mesure qu'on monte en corps.
 * C'est exactement ce que la landing demandait — un titre qui PESE — sans
 * ajouter de seconde police d'affichage.
 *
 * Son nom n'est pas pour rien dans le choix : la police du bricolage sur le
 * produit du batiment. On ne l'ecrira nulle part, et c'est tres bien ainsi.
 */
export const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  axes: ['opsz', 'wdth'],
  display: 'swap',
})

/**
 * Le logotype, et lui seul.
 *
 * La marque ne suit pas les changements de charte : c'est ce qui en fait une
 * marque. « d'equerre » reste en Archivo 800 sur l'ecran comme sur le PDF et
 * sur les images de partage, qui tirent la meme fonte depuis `src/pdf/fonts`.
 * Un seul fichier, un seul poids.
 */
export const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  weight: ['800'],
  display: 'swap',
})

/** Corps et donnees. Neutre, lisible en tableau. */
export const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})
