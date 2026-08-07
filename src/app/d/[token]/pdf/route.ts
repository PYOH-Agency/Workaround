import { loadQuoteByToken } from '@/services/quote-public'
import { renderQuotePdf } from '@/pdf/quote-pdf'

// @react-pdf/renderer a besoin de l'environnement Node.
export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const quote = await loadQuoteByToken(token)

  if (!quote) return new Response('Introuvable', { status: 404 })

  const pdf = await renderQuotePdf(quote)

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="devis-${quote.number}.pdf"`,
      // Le PDF est la representation exacte d'un devis a un instant donne :
      // il ne doit jamais etre servi depuis un cache.
      'Cache-Control': 'no-store',
    },
  })
}
