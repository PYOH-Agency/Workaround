import NextLink from 'next/link'
import { buttonStyle, type ButtonSize, type ButtonTone } from './button'

/**
 * Un lien qui a l'allure d'un bouton.
 *
 * Il existe parce que le HTML distingue **agir** et **naviguer** : imbriquer un
 * `<button>` dans un `<a>` est invalide, et un lecteur d'ecran annoncerait un
 * role incoherent. « Creer un devis » est une navigation, donc un lien.
 *
 * Absent de l'inventaire initial de la spec (§6.1) : le besoin est apparu a
 * l'implementation, l'inventaire a ete corrige.
 */
export function ButtonLink({
  href,
  tone = 'primary',
  size = 'md',
  children,
}: {
  href: string
  tone?: ButtonTone
  size?: ButtonSize
  children: React.ReactNode
}) {
  return (
    <NextLink href={href} className={buttonStyle(tone, size)}>
      {children}
    </NextLink>
  )
}
