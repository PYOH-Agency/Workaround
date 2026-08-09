import type { BusyInterval } from '@/domain/busy'
import { expectOk, parseGoogleBusy, type CalendarProvider } from './calendar-providers'

export const google: CalendarProvider = {
  id: 'google',
  label: 'Google Agenda',
  configured: () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),

  authorizeUrl: ({ redirectUri, state }) =>
    `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.freebusy openid email',
      // Les DEUX sont necessaires. Sans eux, la seconde autorisation ne rend
      // aucun jeton de rafraichissement, et le raccordement se coupe
      // silencieusement au bout d'une heure — un defaut invisible le premier
      // jour.
      access_type: 'offline',
      prompt: 'consent',
      state,
    })}`,

  async exchange({ code, redirectUri }) {
    const body = await expectOk(
      await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID ?? '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      }),
      'Échange du code Google',
    )

    const { refresh_token: refreshToken, id_token: idToken } = body as {
      refresh_token?: string
      id_token?: string
    }
    if (!refreshToken) throw new Error('Google n’a pas rendu de jeton de rafraîchissement')

    return { refreshToken, accountEmail: emailFromIdToken(idToken) }
  },

  async accessToken(refreshToken) {
    const body = await expectOk(
      await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID ?? '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      }),
      'Rafraîchissement Google',
    )

    return (body as { access_token: string }).access_token
  },

  async busy({ accessToken, from, to }) {
    const body = await expectOk(
      await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          items: [{ id: 'primary' }],
        }),
      }),
      'Lecture des créneaux Google',
    )

    return parseGoogleBusy(body)
  },
}

/** L'adresse du compte, lue dans le jeton d'identite. Jamais verifiee ici. */
function emailFromIdToken(idToken: string | undefined): string {
  if (!idToken) return 'compte Google'

  try {
    const [, payload] = idToken.split('.')
    const { email } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof email === 'string' ? email : 'compte Google'
  } catch {
    return 'compte Google'
  }
}
