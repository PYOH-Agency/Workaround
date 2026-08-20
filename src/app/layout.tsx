import type { Metadata } from 'next'
import { archivo, bricolage, inter } from '@/ui/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: "D'équerre — devis, factures et vérification pour le bâtiment",
  description:
    'Faites vos devis et vos factures, faites-les signer, et montrez que votre assurance est à jour.',
}

/**
 * Amorce du document : le theme, et l'activation du mouvement.
 *
 * `dq-motion` conditionne l'etat initial masque des elements animes. Sans
 * JavaScript la classe n'est jamais posee, donc rien n'est masque — une
 * animation qui ne se declenche pas ne doit pas effacer une page.
 */
const BOOTSTRAP = `try{var d=document.documentElement;var t=localStorage.getItem('dq-theme');if(t==='dark'||t==='light')d.dataset.theme=t;d.classList.add('dq-motion')}catch(e){}`

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="fr"
      className={`${bricolage.variable} ${archivo.variable} ${inter.variable} h-full antialiased`}
      // L'amorce ci-dessus modifie `data-theme` avant l'hydratation.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-ink">{children}</body>
    </html>
  )
}
