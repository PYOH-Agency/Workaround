import NextLink from 'next/link'
import { buttonStyle, SIZES, TONES } from './button'

/**
 * Un lien qui a l'allure d'un bouton.
 *
 * Il existe parce que le HTML distingue **agir** et **naviguer** : imbriquer un
 * `<button>` dans un `<a>` est invalide, et un lecteur d'ecran annoncerait un
 * role incoherent. « Creer un devis » est une navigation, donc un lien.
 */
export function ButtonLink({
  href,
  tone = 'primary',
  size = 'md',
  children,
}: {
  href: string
  tone?: keyof typeof TONES
  size?: keyof typeof SIZES
  children: React.ReactNode
}) {
  return (
    <NextLink href={href} className={buttonStyle(tone, size)}>
      {children}
    </NextLink>
  )
}
