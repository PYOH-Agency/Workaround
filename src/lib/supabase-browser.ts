import { createBrowserClient } from '@supabase/ssr'

/**
 * Le client Supabase du navigateur, cree A LA DEMANDE.
 *
 * **Jamais dans le corps d'un composant.** Le corps s'execute aussi au
 * prerendu, cote serveur, et `createBrowserClient` leve des que les cles
 * publiques manquent :
 *
 *     Error occurred prerendering page "/connexion"
 *     @supabase/ssr: Your project's URL and API key are required
 *
 * Un `next build` entier tombe alors sur une page qui n'avait besoin du client
 * qu'au clic. Quatre ecrans le creaient ainsi — les trois portes et l'etape de
 * l'adresse —, et il suffisait qu'un environnement de construction n'ait pas
 * les deux variables pour que rien ne se deploie.
 *
 * Appelee dans le gestionnaire, la creation ne s'execute que dans le
 * navigateur, ou les cles sont toujours la. `createBrowserClient` memoise par
 * arguments : l'appeler a chaque clic ne cree pas un client a chaque clic.
 */
export function browserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
