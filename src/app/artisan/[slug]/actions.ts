'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { relayContact } from '@/services/contact'

export interface ContactState {
  error?: string
  sent?: number
}

/**
 * L'empreinte de l'adresse d'origine, jamais l'adresse.
 *
 * Le sel evite qu'une empreinte se retrouve par force brute sur l'espace des
 * adresses IPv4, qui est petit. Il est **propre a cet usage** : reutiliser
 * celui des codes SMS lierait deux traitements qui n'ont rien a voir, et
 * compromettrait les deux si l'un fuyait.
 */
function ipHash(value: string): string {
  return createHash('sha256')
    .update(`${process.env.CONTACT_IP_SALT ?? ''}${value}`)
    .digest('hex')
}

export async function sendContact(state: ContactState, form: FormData): Promise<ContactState> {
  const list = await headers()
  const ip = list.get('x-forwarded-for')?.split(',')[0].trim() ?? 'inconnu'

  const message = String(form.get('message') ?? '').trim()
  if (message.length < 10) {
    return { error: 'Décrivez votre besoin en quelques mots.', sent: state.sent }
  }

  try {
    await relayContact(
      {
        companyId: String(form.get('entreprise')),
        name: String(form.get('nom') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        phone: String(form.get('telephone') ?? '').trim(),
        message,
        ipHash: ipHash(ip),
      },
      new Date(),
    )
  } catch (e) {
    return { error: (e as Error).message, sent: state.sent }
  }

  return { sent: (state.sent ?? 0) + 1 }
}
