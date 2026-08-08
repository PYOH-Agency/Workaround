import { join } from 'node:path'
import { Font } from '@react-pdf/renderer'

/**
 * Enregistre les polices de la marque pour le PDF.
 *
 * `@react-pdf/renderer` ignore `next/font` : il lui faut des fichiers. On les
 * embarque dans le depot plutot que de les charger depuis une URL, parce qu'un
 * rendu de PDF ne doit dependre d'aucun reseau. Archivo et Inter sont sous
 * licence OFL, qui autorise explicitement l'embarquement.
 */
let registered = false

export function registerBrandFonts(): void {
  if (registered) return

  const dir = join(process.cwd(), 'src', 'pdf', 'fonts')

  // Inter n'est enregistre qu'en graisse normale : dans un document, tout ce qui
  // est gras est du titrage, donc de l'Archivo.
  Font.register({
    family: 'Inter',
    fonts: [{ src: join(dir, 'Inter-Regular.ttf'), fontWeight: 400 }],
  })

  Font.register({
    family: 'Archivo',
    fonts: [
      { src: join(dir, 'Archivo-Regular.ttf'), fontWeight: 400 },
      { src: join(dir, 'Archivo-Bold.ttf'), fontWeight: 700 },
      { src: join(dir, 'Archivo-ExtraBold.ttf'), fontWeight: 800 },
    ],
  })

  // Sans ca, react-pdf coupe les mots francais n'importe ou : « rétracta-tion ».
  Font.registerHyphenationCallback((word) => [word])

  registered = true
}
