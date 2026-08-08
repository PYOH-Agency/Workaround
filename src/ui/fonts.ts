import { Archivo, Inter } from 'next/font/google'

/**
 * Les deux familles du produit, et il n'y en aura pas de troisieme.
 *
 * `next/font/google` telecharge et sert les fichiers depuis notre domaine :
 * aucune requete vers Google au chargement. C'est un gain de performance, et
 * surtout une exigence du cadrage RGPD.
 */

/** Titrage. Industriel, large, solide. */
export const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  display: 'swap',
})

/** Corps et donnees. Neutre, lisible en tableau. */
export const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})
