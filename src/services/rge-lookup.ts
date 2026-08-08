import type { RgeRow } from '@/domain/rge'

const ADEME = 'https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines'

/** Qualifications RGE d'un etablissement. Source ouverte, 10 appels/s/IP. */
export async function fetchRgeRows(siret: string): Promise<RgeRow[]> {
  const response = await fetch(`${ADEME}?q=${encodeURIComponent(siret)}&size=100`)
  if (!response.ok) throw new Error(`ADEME indisponible (${response.status})`)

  const body = (await response.json()) as { results?: RgeRow[] }
  // La recherche plein texte peut ramener des voisins : on filtre sur le SIRET.
  return (body.results ?? []).filter((row) => row.siret === siret)
}
