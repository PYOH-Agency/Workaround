import { classifyNotice } from '@/domain/bodacc'
import { sirenFromSiret } from '@/domain/vat-number'
import { CompanyNotFound, findEstablishment } from '@/services/company-lookup'
import { fetchCollectiveProceedings } from '@/services/legal-checks'

export interface VerificationIdentity {
  legalName: string
  legalFormLabel: string | null
  city: string
  foundedOn: Date | null
}

export interface VerificationAlert {
  kind: 'closed' | 'proceeding'
  label: string
}

export interface VerificationView {
  siret: string
  /** `null` si le repertoire n'a pas repondu, ou si le SIRET n'y figure pas. */
  identity: VerificationIdentity | null
  unknownSiret: boolean
  registryUnavailable: boolean
  alerts: VerificationAlert[]
  alertsUnavailable: boolean
}

/**
 * Ce que la page de verification a le droit de montrer.
 *
 * **Aucun signal positif n'en sort** : ni RGE, ni « etablissement actif », ni
 * score. La page ne peut qu'identifier ou alerter, jamais rassurer — trois
 * coches vertes suivies d'un silence sur la decennale reproduiraient exactement
 * le piege que `/verifier` denonce.
 *
 * Les deux sources sont interrogees en parallele et echouent separement : le
 * verdict de couverture vient de notre base, donc la page reste servable meme
 * si tout l'open data tombe.
 */
export async function verificationView(siret: string, _now: Date): Promise<VerificationView> {
  const [establishment, proceedings] = await Promise.allSettled([
    findEstablishment(siret),
    fetchCollectiveProceedings(sirenFromSiret(siret)),
  ])

  const view: VerificationView = {
    siret,
    identity: null,
    unknownSiret: false,
    registryUnavailable: false,
    alerts: [],
    alertsUnavailable: false,
  }

  if (establishment.status === 'fulfilled') {
    const found = establishment.value
    view.identity = {
      legalName: found.legalName,
      legalFormLabel: found.legalFormLabel,
      city: found.city,
      foundedOn: found.foundedOn,
    }
    if (!found.active) {
      view.alerts.push({ kind: 'closed', label: 'Établissement cessé au répertoire' })
    }
  } else if (establishment.reason instanceof CompanyNotFound) {
    view.unknownSiret = true
  } else {
    view.registryUnavailable = true
  }

  if (proceedings.status === 'fulfilled') {
    // Une conciliation est une demarche volontaire de prevention : la traiter
    // comme une liquidation punirait exactement le bon comportement.
    const blocking = proceedings.value.filter((f) => classifyNotice(f) === 'blocking')
    if (blocking.length > 0) {
      view.alerts.push({
        kind: 'proceeding',
        label: 'Procédure collective publiée au BODACC',
      })
    }
  } else {
    // Surtout pas de liste vide : elle se lirait « aucune procedure ».
    view.alertsUnavailable = true
  }

  return view
}
