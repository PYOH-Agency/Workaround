/**
 * Un separateur purement decoratif — d'ou `aria-hidden`.
 *
 * Son contraste est volontairement faible et WCAG ne lui impose aucun seuil.
 * Il ne doit donc JAMAIS porter seul une information de structure : si une
 * frontiere doit etre percue, c'est a un titre ou a une carte de la porter.
 */
export function Separator() {
  return <hr aria-hidden="true" className="border-0 border-t border-rule" />
}
