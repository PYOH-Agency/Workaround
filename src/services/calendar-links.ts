import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { calendarConnection } from '@/db/schema'
import { mergeBusy, type BusyState } from '@/domain/busy'
import { decryptSecret, encryptSecret } from '@/lib/secrets'
import { providerById } from '@/services/calendar-registry'
import type { ProviderId } from '@/services/calendar-providers'

export interface LinkedCalendar {
  provider: ProviderId
  accountEmail: string
  connectedAt: Date
}

/** Les agendas raccordes de cette entreprise. */
export async function linkedCalendars(companyId: string): Promise<LinkedCalendar[]> {
  return db
    .select({
      provider: calendarConnection.provider,
      accountEmail: calendarConnection.accountEmail,
      connectedAt: calendarConnection.connectedAt,
    })
    .from(calendarConnection)
    .where(
      and(eq(calendarConnection.companyId, companyId), isNull(calendarConnection.revokedAt)),
    )
}

/** Enregistre un raccordement. Le jeton est chiffre avant d'atteindre la base. */
export async function linkCalendar(input: {
  companyId: string
  provider: ProviderId
  accountEmail: string
  refreshToken: string
}) {
  const [row] = await db
    .insert(calendarConnection)
    .values({
      companyId: input.companyId,
      provider: input.provider,
      accountEmail: input.accountEmail,
      refreshTokenEnc: encryptSecret(input.refreshToken),
    })
    // Un second raccordement du meme fournisseur remplace le premier : deux
    // jetons pour un meme agenda ne serviraient a rien.
    .onConflictDoUpdate({
      target: [calendarConnection.companyId, calendarConnection.provider],
      set: {
        accountEmail: input.accountEmail,
        refreshTokenEnc: encryptSecret(input.refreshToken),
        connectedAt: new Date(),
        revokedAt: null,
      },
    })
    .returning()

  return row
}

/**
 * Retire un raccordement.
 *
 * `revoked_at` plutot qu'une suppression : savoir qu'un raccordement a existe
 * et a ete retire vaut mieux que de ne rien savoir. Le jeton chiffre, lui, est
 * efface — il n'a plus de finalite.
 */
export async function unlinkCalendar(companyId: string, provider: ProviderId) {
  await db
    .update(calendarConnection)
    .set({ revokedAt: new Date(), refreshTokenEnc: '' })
    .where(
      and(
        eq(calendarConnection.companyId, companyId),
        eq(calendarConnection.provider, provider),
      ),
    )
}

/**
 * Les creneaux occupes d'une entreprise sur une periode.
 *
 * **Rien n'est ecrit.** Ni les intervalles, ni un cache, ni un horodatage de
 * derniere lecture : c'est la promesse du jalon, et elle se verifie en
 * regardant la base.
 *
 * Toute erreur devient `unreadable`, jamais `connected` avec un tableau vide.
 * Afficher « libre » faute de reponse ferait poser un rendez-vous par-dessus
 * un autre — et l'artisan cesserait de faire confiance a l'ecran, ce qui est
 * pire que l'oubli lui-meme.
 */
export async function busyFor(companyId: string, from: Date, to: Date): Promise<BusyState> {
  const links = await db
    .select({
      provider: calendarConnection.provider,
      refreshTokenEnc: calendarConnection.refreshTokenEnc,
    })
    .from(calendarConnection)
    .where(
      and(eq(calendarConnection.companyId, companyId), isNull(calendarConnection.revokedAt)),
    )

  if (links.length === 0) return { kind: 'unlinked' }

  try {
    const gathered = await Promise.all(
      links.map(async (link) => {
        const provider = providerById(link.provider)
        if (!provider) throw new Error(`Fournisseur inconnu : ${link.provider}`)

        const accessToken = await provider.accessToken(decryptSecret(link.refreshTokenEnc))
        return provider.busy({ accessToken, from, to })
      }),
    )

    return { kind: 'connected', intervals: mergeBusy(gathered.flat()) }
  } catch (error) {
    // Journalise cote serveur, et rien de plus : l'ecran dira qu'il n'a pas pu
    // lire, pas pourquoi.
    console.error('Lecture des créneaux occupés impossible', error)
    return { kind: 'unreadable' }
  }
}
