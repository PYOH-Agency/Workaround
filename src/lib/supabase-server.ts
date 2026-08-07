import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Client Supabase cote serveur.
 *
 * Supabase est utilise comme Postgres manage, pas comme framework : les
 * autorisations metier vivent dans le code applicatif, ou elles sont testables.
 * Ce client ne sert qu'a l'authentification et au stockage de fichiers.
 */
export async function createServerSupabase() {
  const store = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options))
          } catch {
            // Appele depuis un Server Component : l'ecriture de cookie y est
            // interdite. Le middleware rafraichit la session, on peut ignorer.
          }
        },
      },
    },
  )
}
