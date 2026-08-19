import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import styles from './ink-band.module.css'

/**
 * La bande d'encre : le seul contraste fort des deux pages d'entree.
 *
 * **Pourquoi elle existe.** `surface` (#F5F1E8) et `card` (#FDFCF8) sont a 2 %
 * l'un de l'autre. Sur 3 000 px de page, huit sections qui alternent ces deux
 * valeurs ne font pas un rythme : elles font un seul aplat creme, ou rien
 * n'accroche et ou tout se vaut. C'est la cause premiere de l'impression de
 * page triste, avant la typographie et avant le mouvement.
 *
 * Chaque page en porte deux, et jamais plus : celle qui pose le probleme, et
 * celle qui appelle a l'action en fin de parcours. Entre les deux, la craie
 * respire. Trois bandes feraient une page zebree, ou l'encre ne dirait plus
 * rien.
 *
 * **Ce n'est pas un theme sombre.** `bg-primary` / `text-on-primary` sont deux
 * jetons dont le contraste est verifie (`contrast.test.ts`) ; la variante
 * `dark:` reste inerte ici, et c'est voulu — voir la limite assumee de
 * `tokens.css`. D'ou les tons `inverse` de `Text`, `Heading` et
 * `SectionHeader`, qui descendent ensemble.
 *
 * **Le chiffre.** Quand la bande en porte un, il arrive par un balayage —
 * jamais un fondu : un nombre qui apparait en transparence a l'air incertain,
 * un nombre qui se decouvre a l'air ecrit. Le filet terre cuite le suit, et
 * c'est le meme filet d'accent que porte deja la vitrine en clair.
 */
export function InkBand({
  figure,
  figureLabel,
  figureNote,
  children,
}: {
  /** Le fait qu'on veut voir de loin : « 15 000 € », « 0 € », « 10 ans ». */
  figure?: string
  /** Ce que le chiffre compte. Au-dessus de lui, comme sur un releve. */
  figureLabel?: string
  /** L'unite ou la reserve. En dessous, en petit. */
  figureNote?: string
  children: React.ReactNode
}) {
  return (
    <section className={`${styles.band} bg-primary`}>
      <div className="mx-auto w-full max-w-5xl px-6 py-20 md:py-28">
        {figure ? (
          <div className="grid gap-10 md:grid-cols-[minmax(0,auto)_1fr] md:items-center md:gap-16">
            <div className="flex flex-col gap-3">
              {figureLabel ? (
                <Text size="label" tone="inverse-soft">
                  {figureLabel}
                </Text>
              ) : null}
              <div className={styles.wipe}>
                <Heading level="figure" as="p" tone="inverse">
                  {figure}
                </Heading>
              </div>
              <span aria-hidden="true" className={`${styles.rule} bg-brand`} />
              {figureNote ? (
                <Text size="sm" tone="inverse-soft">
                  {figureNote}
                </Text>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-5">{children}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">{children}</div>
        )}
      </div>
    </section>
  )
}
