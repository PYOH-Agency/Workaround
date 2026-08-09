'use server'

import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { currentCompany } from '@/lib/session'
import { revokeAgendaFeed } from '@/services/agenda-feed'
import { unlinkCalendar } from '@/services/calendar-links'
import { providerById } from '@/services/calendar-registry'
import type { ProviderId } from '@/services/calendar-providers'

export interface SyncState {
  error?: string
}

/** Régénère l'adresse d'abonnement : l'ancienne cesse aussitôt de répondre. */
export async function regenerateFeed(_state: SyncState): Promise<SyncState> {
  const { companyId } = await currentCompany()
  await revokeAgendaFeed(companyId)

  revalidatePath('/agenda/synchronisation')
  return {}
}

export async function unlink(provider: ProviderId, _state: SyncState): Promise<SyncState> {
  const { companyId } = await currentCompany()
  await unlinkCalendar(companyId, provider)

  revalidatePath('/agenda/synchronisation')
  return {}
}

/**
 * Envoie l'artisan chez son fournisseur.
 *
 * Le `state` est un nonce depose en cookie `httpOnly` et compare au retour :
 * sans lui, un tiers pourrait faire raccorder SON agenda au compte de
 * l'artisan en lui faisant ouvrir une adresse fabriquee.
 */
export async function startLink(providerId: ProviderId, _state: SyncState): Promise<SyncState> {
  await currentCompany()

  const provider = providerById(providerId)
  if (!provider) return { error: 'Fournisseur inconnu.' }
  if (!provider.configured()) {
    return { error: `${provider.label} n’est pas encore configuré sur cette installation.` }
  }

  const nonce = randomBytes(16).toString('base64url')
  const store = await cookies()
  store.set(`calendrier_${providerId}`, nonce, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const url = provider.authorizeUrl({
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendriers/${providerId}/retour`,
    state: nonce,
  })

  // Hors du bloc precedent : `redirect` signale la navigation en levant.
  redirect(url)
}
