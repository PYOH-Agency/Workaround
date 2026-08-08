import { loadInvoiceByToken } from '@/services/invoice-public'
import { renderInvoicePdf } from '@/pdf/invoice-pdf'

// @react-pdf/renderer a besoin de l'environnement Node.
export const runtime = 'nodejs'

// Le prefixe /f/ plutot que /devis/ : deux segments dynamiques freres sous un
// meme parent cassent la compilation, ce qui avait failli arriver en M1.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invoice = await loadInvoiceByToken(token)

  if (!invoice) return new Response('Introuvable', { status: 404 })

  const pdf = await renderInvoicePdf(invoice)
  const kind = invoice.type === 'credit_note' ? 'avoir' : 'facture'

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${kind}-${invoice.number}.pdf"`,
      // Le reste du evolue a chaque encaissement : jamais de cache.
      'Cache-Control': 'no-store',
    },
  })
}
