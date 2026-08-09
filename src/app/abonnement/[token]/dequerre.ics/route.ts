import { agendaFeed } from '@/services/agenda-feed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Le flux, servi a qui detient l'adresse.
 *
 * `no-store` : un agenda mis en cache par un intermediaire montrerait un
 * rendez-vous annule a un artisan qui vient de l'annuler.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const feed = await agendaFeed(token, new Date())

  if (!feed) return new Response('Introuvable', { status: 404 })

  return new Response(feed, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
