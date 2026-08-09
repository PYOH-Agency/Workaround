'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { requester } from '@/db/schema'
import { currentRequester } from '@/lib/session'
import { bookedCompany } from '@/services/address-book'
import { relayContact } from '@/services/contact'

export interface RepeatContactState {
  error?: string
  sent?: boolean
}

/**
 * La MEME empreinte que le formulaire de l'annuaire, sel compris.
 *
 * Deux sels pour un meme plafond le rendraient contournable en changeant de
 * page : cinq demandes par l'annuaire, puis cinq par le repertoire.
 */
function ipHash(value: string): string {
  return createHash('sha256')
    .update(`${process.env.CONTACT_IP_SALT ?? ''}${value}`)
    .digest('hex')
}

/**
 * Le demandeur recontacte une entreprise de son repertoire.
 *
 * Son nom et son adresse viennent de sa session : **il ne les retape pas.**
 * Rien de ce qu'il ecrit n'est conserve — la regle de M4 tient sans exception,
 * et c'est ce qui rend impossible, et non pas seulement interdite, la
 * constitution d'une base de contacts.
 */
export async function sendRepeatContact(
  companyId: string,
  _state: RepeatContactState,
  form: FormData,
): Promise<RepeatContactState> {
  const session = await currentRequester()

  const message = String(form.get('message') ?? '').trim()
  if (message.length < 10) return { error: 'Décrivez votre besoin en quelques mots.' }

  const sheet = await bookedCompany(session.requesterId, companyId, new Date())
  if (!sheet) return { error: 'Entreprise introuvable dans votre répertoire.' }

  const [me] = await db.select().from(requester).where(eq(requester.id, session.requesterId))
  const list = await headers()
  const ip = list.get('x-forwarded-for')?.split(',')[0].trim() ?? 'inconnu'

  try {
    await relayContact(
      {
        companyId,
        name: me.name,
        email: me.email,
        phone: '',
        message,
        ipHash: ipHash(ip),
        previousQuoteNumber: sheet.previousQuoteNumber,
      },
      new Date(),
    )
  } catch (e) {
    return { error: (e as Error).message }
  }

  return { sent: true }
}
