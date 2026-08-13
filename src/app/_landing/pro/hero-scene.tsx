'use client'

import { useEffect, useRef } from 'react'
import { Squaring } from './squaring'

/**
 * La scene d'accroche, rendue sensible au curseur.
 *
 * Le geste de marque devient jouable : on approche le pointeur, la FEUILLE
 * suit — legerement, en profondeur —, et l'equerre, elle, ne bouge pas d'un
 * pixel. C'est exactement la these du produit, mise en main : on presente
 * l'ouvrage a l'outil, l'outil tient la reference. La regle §4.6 (la marque ne
 * pivote jamais) est donc respectee au moment meme ou l'on ajoute du mouvement.
 *
 * Le pointeur pilote deux variables CSS (`--dq-px`, `--dq-py`, normalisees a
 * [-1, 1]) que `squaring.module.css` traduit en translations. Rien ne bouge
 * tant qu'un vrai pointeur ne survole pas : la logique est bornee a
 * `(pointer: fine)` — un doigt sur telephone ne declenche aucun suivi — et
 * `prefers-reduced-motion` la coupe entierement. Sans JavaScript, on retombe
 * sur la scene telle quelle : le wrapper n'ajoute que des variables.
 *
 * `requestAnimationFrame` dedoublonne les evenements de pointeur : au plus une
 * ecriture de style par image, jamais une par mouvement de souris.
 */
export function HeroScene() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)')

    let frame = 0
    let px = 0
    let py = 0

    const apply = () => {
      frame = 0
      node.style.setProperty('--dq-px', px.toFixed(3))
      node.style.setProperty('--dq-py', py.toFixed(3))
    }

    const onMove = (event: PointerEvent) => {
      // Souris seulement : un doigt qui fait defiler la page ne doit pas
      // trainer la scene avec lui. Le test se fait a l'evenement, pas au
      // montage — l'inclinaison du pointeur n'est pas toujours connue quand la
      // page s'hydrate, et un gardien au montage coupait le suivi a tort.
      if (event.pointerType && event.pointerType !== 'mouse') return
      if (still.matches) return

      const box = node.getBoundingClientRect()
      // Ecart au centre, normalise : le bord vaut 1, le centre 0.
      px = Math.max(-1, Math.min(1, (event.clientX - (box.left + box.width / 2)) / (box.width / 2)))
      py = Math.max(-1, Math.min(1, (event.clientY - (box.top + box.height / 2)) / (box.height / 2)))
      if (!frame) frame = requestAnimationFrame(apply)
    }

    const onLeave = () => {
      px = 0
      py = 0
      if (!frame) frame = requestAnimationFrame(apply)
    }

    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div ref={ref} data-hero-scene="">
      <Squaring />
    </div>
  )
}
