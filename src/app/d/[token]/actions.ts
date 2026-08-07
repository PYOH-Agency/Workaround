'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { quote, signature, signatureCode } from '@/db/schema'
import { loadQuoteByToken } from '@/services/quote-public'
import { renderQuotePdf } from '@/pdf/quote-pdf'
import {
  buildProof,
  documentHash,
  generateCode,
  hashCode,
  verifyCode,
  CODE_TTL_MS,
} from '@/services/signature'
import { requestTimestamp } from '@/services/timestamp'
import { sendSms } from '@/services/sms'
import { recordEvent } from '@/services/events'
import { createServiceSupabase } from '@/lib/supabase-server'

export interface SignState {
  error?: string
  codeSent?: boolean
  signed?: boolean
}

/** Envoie un code a usage unique au numero que l'artisan a saisi. */
export async function requestCode(token: string, _state: SignState): Promise<SignState> {
  const found = await loadQuoteByToken(token)
  if (!found) return { error: 'Devis introuvable.' }
  if (found.status !== 'sent') return { error: 'Ce devis ne peut plus être signé.' }
  if (!found.customer.phone) return { error: 'Aucun numéro de téléphone associé à ce devis.' }

  const code = generateCode()

  await db.insert(signatureCode).values({
    quoteId: found.id,
    codeHash: hashCode(code),
    phone: found.customer.phone,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  })

  await sendSms(
    found.customer.phone,
    `Votre code de signature pour le devis ${found.number} : ${code}. Valable 10 minutes.`,
  )

  return { codeSent: true }
}

export async function signQuote(token: string, _state: SignState, form: FormData): Promise<SignState> {
  const requestHeaders = await headers()
  const found = await loadQuoteByToken(token)

  if (!found) return { error: 'Devis introuvable.' }
  if (found.status !== 'sent') return { error: 'Ce devis ne peut plus être signé.' }

  // 1. Identification : le code SMS doit etre valide.
  const latestCode = await db.query.signatureCode.findFirst({
    where: eq(signatureCode.quoteId, found.id),
    orderBy: (c) => [desc(c.createdAt)],
  })

  if (!latestCode) return { error: 'Demandez d’abord un code par SMS.', codeSent: false }

  let codeIsValid: boolean
  try {
    codeIsValid = verifyCode(latestCode, String(form.get('code') ?? ''))
  } catch (e) {
    return { error: (e as Error).message, codeSent: true }
  }

  if (!codeIsValid) {
    await db
      .update(signatureCode)
      .set({ attempts: sql`${signatureCode.attempts} + 1` })
      .where(eq(signatureCode.id, latestCode.id))
    return { error: 'Code incorrect.', codeSent: true }
  }

  const codeValidatedAt = new Date()
  await db
    .update(signatureCode)
    .set({ validatedAt: codeValidatedAt })
    .where(eq(signatureCode.id, latestCode.id))

  // 2. Integrite : on rend le PDF UNE fois, on le hache, et on l'archive tel
  // quel. Le regenerer plus tard depuis un gabarit modifie produirait un
  // document different et invaliderait l'empreinte en silence.
  const pdf = await renderQuotePdf(found)
  const hash = documentHash(pdf)
  const archivedPdfPath = `${found.companyId}/${found.id}.pdf`

  const storage = createServiceSupabase()
  const { error: uploadError } = await storage.storage
    .from('signed-quotes')
    .upload(archivedPdfPath, pdf, { contentType: 'application/pdf', upsert: false })

  if (uploadError) return { error: "Impossible d'archiver le devis. Réessayez.", codeSent: true }

  let proof
  try {
    proof = buildProof({
      signerName: String(form.get('name') ?? ''),
      signerEmail: String(form.get('email') ?? ''),
      signerPhone: latestCode.phone,
      codeValidatedAt,
      ipAddress: requestHeaders.get('x-forwarded-for')?.split(',')[0].trim() ?? 'inconnue',
      userAgent: requestHeaders.get('user-agent') ?? 'inconnu',
      documentHash: hash,
      archivedPdfPath,
    })
  } catch (e) {
    return { error: (e as Error).message, codeSent: true }
  }

  // 3. Lien signature <-> acte. Non bloquant : la TSA n'offre aucun engagement
  // de service, et une signature sans jeton reste valable.
  const timestampToken = await requestTimestamp(hash)

  await db.insert(signature).values({ quoteId: found.id, ...proof, timestampToken })
  await db.update(quote).set({ status: 'signed', signedAt: new Date() }).where(eq(quote.id, found.id))

  await recordEvent({
    type: 'quote.signed',
    subjectType: 'quote',
    subjectId: found.id,
    companyId: found.companyId,
    actorType: 'customer',
    actorId: proof.signerEmail,
    payload: { documentHash: hash, timestamped: timestampToken !== null },
  })

  revalidatePath(`/d/${token}`)
  return { signed: true }
}
