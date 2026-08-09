/**
 * Le carre de l'angle verifie. A placer dans un `Reveal`, une seule fois.
 *
 * Sans hook ni API navigateur : un `<span>` statique n'a pas besoin de
 * frontiere client, `Reveal` (qui, lui, en porte une) le compose tel quel.
 */
export function RevealTick() {
  return (
    <span
      data-reveal-tick=""
      aria-hidden="true"
      className="ml-2.5 inline-block size-3 bg-brand align-middle"
    />
  )
}
