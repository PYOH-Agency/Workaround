/**
 * Classement des avis du BODACC.
 *
 * Les familles sont normalisees par la DILA, ce qui evite d'analyser du texte
 * libre. On classe explicitement, et tout ce qui n'est pas connu est neutre :
 * bloquer sur l'inconnu rendrait toute evolution de la nomenclature capable de
 * suspendre des entreprises saines.
 */
export type NoticeEffect = 'blocking' | 'signal' | 'neutral'

const BLOCKING = new Set(['collective', 'retablissement_professionnel', 'radiation'])

/**
 * La conciliation est une demarche volontaire et confidentielle de prevention.
 * La traiter comme une liquidation punirait le bon comportement.
 */
const SIGNAL = new Set(['conciliation'])

export function classifyNotice(family: string): NoticeEffect {
  if (BLOCKING.has(family)) return 'blocking'
  if (SIGNAL.has(family)) return 'signal'
  return 'neutral'
}

export function legalStatusFrom(families: string[]): 'active' | 'blocked' {
  return families.some((f) => classifyNotice(f) === 'blocking') ? 'blocked' : 'active'
}
