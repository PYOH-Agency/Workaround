import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Rafraichit la session Supabase a chaque requete.
 *
 * Indispensable : un Server Component ne peut pas ecrire de cookie. Sans cette
 * couche, le jeton d'acces n'est jamais renouvele et la session expire en
 * silence au bout d'une heure — l'artisan se retrouve deconnecte en plein devis.
 *
 * Nommee `proxy` : Next.js 16 a remplace la convention `middleware`.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // Cet appel est ce qui declenche le rafraichissement. Ne pas le supprimer.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Tout sauf les fichiers statiques et les images.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
