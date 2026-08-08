import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { legalCheck } from '@/db/schema'
import { legalStatusFrom } from '@/domain/bodacc'
import { sirenFromSiret } from '@/domain/vat-number'
import { findEstablishment } from '@/services/company-lookup'
import { recordEvent } from '@/services/events'

const BODACC =
  'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records'

/**
 * Avis BODACC concernant un SIREN.
 *
 * Source ouverte, sans cle ni inscription. API Entreprise, qui serait la voie
 * officielle, nous est fermee : elle est reservee aux organismes charges d'une
 * mission de service public.
 *
 * Une panne de la source **leve** plutot que de renvoyer une liste vide : une
 * liste vide serait interpretee comme « aucune procedure », et une
 * indisponibilite du BODACC suspendrait alors des entreprises saines — ou pire,
 * en blanchirait de reellement en difficulte.
 */
export async function fetchCollectiveProceedings(siren: string): Promise<string[]> {
  const url = `${BODACC}?where=${encodeURIComponent(`registre like "${siren}"`)}&select=familleavis&limit=100`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`BODACC indisponible (${response.status})`)

  const body = (await response.json()) as { results?: { familleavis: string | null }[] }
  return (body.results ?? []).map((r) => r.familleavis).filter((f): f is string => Boolean(f))
}

/**
 * Rejoue les controles automatiques et enregistre leur resultat.
 *
 * Rien ici ne modifie une visibilite : elle se calcule a la lecture, a partir
 * du dernier controle enregistre. Ce service ne fait qu'ecrire des constats
 * dates — ce qui le rend incapable de faire diverger quoi que ce soit.
 *
 * Une source indisponible **n'ecrit rien**. Enregistrer « actif » parce que le
 * BODACC n'a pas repondu blanchirait une entreprise en liquidation ;
 * enregistrer « bloque » suspendrait une entreprise saine. Le dernier constat
 * connu reste en vigueur, et c'est la seule reponse honnete.
 */
export async function runLegalChecks(companyId: string, siret: string) {
  const results: { source: 'sirene' | 'bodacc'; status: 'active' | 'blocked'; detail: string }[] = []

  try {
    const establishment = await findEstablishment(siret)
    results.push({
      source: 'sirene',
      status: establishment.active ? 'active' : 'blocked',
      detail: establishment.active ? 'Établissement actif' : 'Établissement cessé au répertoire',
    })
  } catch {
    // Source indisponible : on ne conclut pas.
  }

  try {
    const families = await fetchCollectiveProceedings(sirenFromSiret(siret))
    const status = legalStatusFrom(families)
    results.push({
      source: 'bodacc',
      status,
      detail:
        status === 'blocked' ? `Avis bloquant : ${families.join(', ')}` : 'Aucun avis bloquant',
    })
  } catch {
    // Idem.
  }

  for (const result of results) {
    const [previous] = await db
      .select({ status: legalCheck.status })
      .from(legalCheck)
      .where(and(eq(legalCheck.companyId, companyId), eq(legalCheck.source, result.source)))
      .orderBy(desc(legalCheck.checkedAt))
      .limit(1)

    await db.insert(legalCheck).values({ companyId, ...result })

    // Seules les TRANSITIONS entrent au journal : un constat identique chaque
    // jour le noierait, et le passeport de M4 y lit des changements d'etat.
    if (previous?.status !== result.status) {
      await recordEvent({
        type: result.status === 'blocked' ? 'company.blocked' : 'company.unblocked',
        subjectType: 'company',
        subjectId: companyId,
        companyId,
        actorType: 'system',
        payload: { source: result.source, detail: result.detail },
      })
    }
  }

  return results
}
