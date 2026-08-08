import type { Metadata } from 'next'
import { archivo, inter } from '@/ui/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: "D'équerre — devis, factures et vérification pour le bâtiment",
  description:
    'Faites vos devis et vos factures, faites-les signer, et montrez que votre assurance est à jour.',
}

/**
 * Pose `data-theme` avant le premier rendu.
 *
 * Sans ca, un utilisateur ayant choisi le mode clair sur un systeme en mode
 * sombre verrait un eclair sombre a chaque navigation. Le script est
 * volontairement minuscule et synchrone : c'est le seul endroit du produit ou
 * bloquer le rendu est le bon choix.
 *
 * Ecrit ici plutot que dans `src/ui/` : ce n'est pas un composant du design
 * system mais une amorce du document, et un `.tsx` a la racine de `src/ui/`
 * echapperait au controle des couches.
 */
const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('dq-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${inter.variable} h-full antialiased`}
      // L'amorce ci-dessus modifie `data-theme` avant l'hydratation.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-ink">{children}</body>
    </html>
  )
}
