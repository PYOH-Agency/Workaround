import { useCallback, useState } from 'react'

/**
 * Bascule a `true` la premiere fois que l'element entre dans la vue.
 *
 * Le hook ne connait rien a l'animation : il pose un fait, le CSS en tire les
 * consequences. C'est ce qui permet a `prefers-reduced-motion` de tout
 * neutraliser sans qu'aucune ligne de JavaScript ne le sache.
 *
 * Une seule bascule, jamais de retour en arriere : un bloc deja lu qui
 * rejouerait son entree au defilement inverse serait desagreable.
 *
 * Une `ref` de rappel plutot qu'un `useRef` + `useEffect` : l'observation ne
 * depend que du noeud DOM, pas d'un evenement externe a re-synchroniser a
 * chaque rendu. React invoque ce rappel exactement quand le noeud apparait ou
 * disparait, ce qui evite d'y appeler `setState` de facon synchrone dans un
 * effet — le cas du navigateur sans `IntersectionObserver` n'a alors plus
 * besoin d'un rendu de plus pour se resoudre.
 */
export function useInView<T extends HTMLElement>(): {
  ref: (node: T | null) => (() => void) | undefined
  inView: boolean
} {
  const [inView, setInView] = useState(false)

  const ref = useCallback((node: T | null) => {
    if (!node) return

    // Navigateur sans IntersectionObserver : on montre, on n'anime pas.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setInView(true)
        observer.disconnect()
      },
      // Le bloc s'anime quand il est engage, pas quand il affleure.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { ref, inView }
}
