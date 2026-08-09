import { google } from './calendar-google'
import { microsoft } from './calendar-microsoft'
import type { CalendarProvider } from './calendar-providers'

/** Les deux fournisseurs, et rien d'autre — Apple n'a pas d'OAuth calendrier. */
export const PROVIDERS: CalendarProvider[] = [google, microsoft]

export function providerById(id: string): CalendarProvider | null {
  return PROVIDERS.find((provider) => provider.id === id) ?? null
}
