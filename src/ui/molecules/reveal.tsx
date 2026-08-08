'use client'

import { useInView } from './use-in-view'

/**
 * La mise d'equerre : le bloc arrive legerement de travers et se redresse.
 *
 * C'est le geste de la marque — **un seul par ecran**, sur le bloc qui porte
 * une promesse. Le carre terre cuite (`RevealTick`) se pose a l'instant ou
 * l'alignement est atteint.
 */
export function Reveal({
  as: Tag = 'div',
  children,
}: {
  as?: 'div' | 'header' | 'section'
  children: React.ReactNode
}) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <Tag ref={ref} data-reveal="" data-in={inView ? '' : undefined}>
      {children}
    </Tag>
  )
}

/** Le carre de l'angle verifie. A placer dans un `Reveal`, une seule fois. */
export function RevealTick() {
  return (
    <span
      data-reveal-tick=""
      aria-hidden="true"
      className="ml-2.5 inline-block size-3 bg-brand align-middle"
    />
  )
}
