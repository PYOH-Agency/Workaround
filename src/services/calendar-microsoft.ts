import { expectOk, parseMicrosoftBusy, type CalendarProvider } from './calendar-providers'

export const microsoft: CalendarProvider = {
  id: 'microsoft',
  label: 'Outlook',
  configured: () =>
    Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),

  authorizeUrl: ({ redirectUri, state }) =>
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      // `offline_access` est ce qui donne le jeton de rafraichissement.
      scope: 'Calendars.ReadBasic offline_access User.Read',
      state,
    })}`,

  async exchange({ code, redirectUri }) {
    const body = await expectOk(
      await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID ?? '',
          client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      }),
      'Échange du code Microsoft',
    )

    const { refresh_token: refreshToken } = body as { refresh_token?: string }
    if (!refreshToken) throw new Error('Microsoft n’a pas rendu de jeton de rafraîchissement')

    const profile = await expectOk(
      await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { authorization: `Bearer ${(body as { access_token: string }).access_token}` },
      }),
      'Lecture du compte Microsoft',
    )

    const { mail, userPrincipalName } = profile as { mail?: string; userPrincipalName?: string }

    return { refreshToken, accountEmail: mail ?? userPrincipalName ?? 'compte Microsoft' }
  },

  async accessToken(refreshToken) {
    const body = await expectOk(
      await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID ?? '',
          client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'Calendars.ReadBasic offline_access',
        }),
      }),
      'Rafraîchissement Microsoft',
    )

    return (body as { access_token: string }).access_token
  },

  async busy({ accessToken, from, to }) {
    const body = await expectOk(
      await fetch('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
          prefer: 'outlook.timezone="UTC"',
        },
        body: JSON.stringify({
          schedules: ['me'],
          startTime: { dateTime: from.toISOString(), timeZone: 'UTC' },
          endTime: { dateTime: to.toISOString(), timeZone: 'UTC' },
          availabilityViewInterval: 30,
        }),
      }),
      'Lecture des créneaux Microsoft',
    )

    return parseMicrosoftBusy(body)
  },
}
