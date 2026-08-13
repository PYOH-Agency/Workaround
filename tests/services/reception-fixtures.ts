import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote, signature } from '@/db/schema'
import { requesterFromSignature } from '@/services/requesters'
import { createCompany, createProject, signedQuote } from './invoice-fixtures'

/** Le point de reference des tests de reception : tout se date autour. */
export const NOW = new Date('2026-05-01T00:00:00Z')

export const someone = () =>
  requesterFromSignature({ email: `p-${randomUUID()}@t.local`, name: 'Paul' })

/** Un chantier signé puis terminé, prêt à être reçu. */
export async function completedChantier() {
  const me = await someone()
  const companyId = await createCompany()
  const projectId = await createProject(companyId)
  const row = await signedQuote(companyId, projectId, 'signed')

  await db.insert(signature).values({
    quoteId: row.id,
    requesterId: me.id,
    signerName: 'Paul Martin',
    signerEmail: `s-${randomUUID().slice(0, 8)}@t.local`,
    signerPhone: '0600000000',
    codeValidatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    documentHash: 'a'.repeat(64),
    archivedPdfPath: `${companyId}/${row.id}.pdf`,
  })

  // Les dates du chantier forment une histoire coherente : signe en mars,
  // termine en avril. `signedQuote` signe « maintenant », ce qui rendrait
  // toute reception d'avril anterieure a sa propre signature.
  await db
    .update(quote)
    .set({
      signedAt: new Date('2026-03-02T00:00:00Z'),
      completedAt: new Date('2026-04-20T00:00:00Z'),
    })
    .where(eq(quote.id, row.id))

  return { me, quoteId: row.id }
}
