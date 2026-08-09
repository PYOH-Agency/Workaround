import { cookies } from 'next/headers'
import { currentCompany } from '@/lib/session'
import { linkCalendar } from '@/services/calendar-links'
import { providerById } from '@/services/calendar-registry'

export const runtime = 'nodejs'

const BACK = '/agenda/synchronisation'

function backWith(reason: string): Response {
  return Response.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}${BACK}?erreur=${encodeURIComponent(reason)}`,
    303,
  )
}

/**
 * Le retour d'autorisation.
 *
 * Le `state` recu est compare au nonce depose en cookie : sans cette
 * comparaison, un tiers ferait raccorder SON agenda au compte de l'artisan en
 * lui faisant ouvrir une adresse fabriquee.
 *
 * Aucun echec ne remonte de trace de pile : l'artisan revient sur son ecran
 * avec une phrase.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params
  const provider = providerById(providerId)
  if (!provider) return backWith('fournisseur_inconnu')

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const store = await cookies()
  const expected = store.get(`calendrier_${provider.id}`)?.value
  store.delete(`calendrier_${provider.id}`)

  if (!code || !state || !expected || state !== expected) return backWith('autorisation_invalide')

  try {
    const { companyId } = await currentCompany()
    const { refreshToken, accountEmail } = await provider.exchange({
      code,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendriers/${provider.id}/retour`,
    })

    await linkCalendar({ companyId, provider: provider.id, accountEmail, refreshToken })
  } catch (error) {
    console.error('Raccordement d’agenda impossible', error)
    return backWith('raccordement_impossible')
  }

  return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${BACK}`, 303)
}
