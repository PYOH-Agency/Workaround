import type { Metadata } from 'next'
import { archivo, inter } from '@/ui/fonts'
import { ThemeScript } from '@/ui/theme-script'
import './globals.css'

export const metadata: Metadata = {
  title: "D'équerre — devis, factures et vérification pour le bâtiment",
  description:
    'Faites vos devis et vos factures, faites-les signer, et montrez que votre assurance est à jour.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="fr"
      className={`${archivo.variable} ${inter.variable} h-full antialiased`}
      // Le script de theme modifie `data-theme` avant l'hydratation.
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-ink">{children}</body>
    </html>
  )
}
