import { redirect } from 'next/navigation'
import { recordPassportView } from '@/services/passport'

export const runtime = 'nodejs'

/**
 * Le passeport, par une adresse courte et mesuree.
 *
 * `/artisan/[slug]` reste l'adresse canonique — celle qui se reference et que
 * l'on partage. `/p/[slug]` est l'entree posee sur les devis, les factures et
 * les courriels : elle constate le passage, puis s'efface.
 *
 * Pourquoi ce detour plutot qu'un lien direct : le canal du devis signe est le
 * seul chemin que le produit possede vers un vrai particulier — il lui est
 * apporte par l'artisan lui-meme. Sans mesure, on ne saura jamais s'il mene
 * quelque part, et l'annuaire continuera d'etre juge sur une intuition.
 *
 * Redirection temporaire, jamais permanente : un 308 serait mis en cache par
 * le navigateur et la deuxieme consultation ne serait plus comptee.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const via = new URL(request.url).searchParams.get('via')

  const destination = await recordPassportView(slug, via)

  // Une entreprise qui n'existe pas ne doit pas rediriger vers une page qui
  // n'existe pas non plus : on repond ici, et le 404 reste lisible.
  if (!destination) return new Response('Introuvable', { status: 404 })

  redirect(destination)
}
