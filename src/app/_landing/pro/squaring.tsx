import styles from './squaring.module.css'

/**
 * La mise a l'equerre.
 *
 * Le devis arrive de travers ; l'equerre, elle, ne bouge pas. La feuille pivote
 * sur son point de contact jusqu'a porter, le jeu se referme, et l'angle
 * verifie s'appose sur le document. C'est le geste du metier — on tient
 * l'equerre et on aligne l'ouvrage dessus — et c'est ce que la marque interdit
 * de mettre en scene autrement : elle ne pivote pas (spec §4.6).
 *
 * Le trace plutot que la capture d'ecran : filets, aplats, angle marque. La
 * page parle le vocabulaire du plan, pas celui du logiciel.
 *
 * Geometrie : la marque de `brand/mark.tsx` a l'echelle 10, decalee de
 * (-60, -20), ce qui donne des bords ronds dans un viewBox de 400. Le coin
 * interieur tombe en (130, 270) : c'est le pivot de la feuille et le coin ou
 * l'angle verifie se pose. L'echelle est dictee par la lecture — la feuille
 * doit tenir ENTIERE dans l'angle, sinon l'equerre a l'air posee a cote de
 * l'ouvrage au lieu de le controler.
 */

/** Les filets du devis : meme abscisse, longueurs decroissantes. */
const RULES = [
  { y: 104, width: 164 },
  { y: 119, width: 148 },
  { y: 134, width: 164 },
  { y: 149, width: 100 },
]

export function Squaring() {
  return (
    <svg
      /*
       * Le cadre coupe la lame : 340 de haut pour un dessin qui en fait 380.
       * L'outil sort donc du cadre par le bas, ce qui allege l'aplat de terre
       * cuite — a pleine hauteur il pesait plus lourd que le bouton de
       * conversion et prenait l'oeil avant lui. Le haut garde sa marge : la
       * feuille passe par la pendant son arrivee, et s'y ferait rogner.
       */
      viewBox="0 0 400 340"
      className={`${styles.scene} h-auto w-full max-w-[26rem]`}
      /*
       * Decorative, comme `Mark` et `Seal` : la scene ne dit rien que l'accroche
       * et le chapeau ne disent deja en toutes lettres. Lui coller une
       * description reviendrait a faire lire une animation a qui ne la voit pas.
       */
      aria-hidden="true"
      focusable="false"
    >
      {/*
        `sheetShift` porte la parallaxe du curseur (variables `--dq-px/--dq-py`
        posees par `HeroScene`), en couche externe : la chronologie d'arrivee
        vit dans `sheetIn`/`sheet`, le suivi du pointeur ici, et les deux
        transforms se composent sans se marcher dessus. C'est la FEUILLE qui
        suit le pointeur ; l'equerre plus bas ne bouge pas.
      */}
      <g className={styles.sheetShift}>
        <g className={styles.sheetIn}>
          <g className={styles.sheet}>
          <rect
            x="130"
            y="40"
            width="200"
            height="230"
            /*
             * `raised` et non `card` : c'est le role de l'elevation, et il est
             * le seul a rester lisible dans les deux themes — blanc franc sur
             * la craie, et plus clair que le fond en sombre, ou `card` se
             * confondrait avec la surface.
             */
            fill="var(--dq-raised)"
            stroke="var(--dq-rule)"
          />

          <rect x="148" y="62" width="76" height="9" fill="var(--dq-ink)" />
          <rect x="148" y="79" width="48" height="5" fill="var(--dq-rule)" />

          {RULES.map(({ y, width }) => (
            <rect key={y} x="148" y={y} width={width} height="4" fill="var(--dq-rule)" />
          ))}

          <rect x="148" y="168" width="164" height="1" fill="var(--dq-rule)" />

          {/* Le total arrive apres coup : la feuille finit de s'ecrire une fois posee. */}
            <g className={styles.late}>
              <rect x="240" y="181" width="72" height="8" fill="var(--dq-ink)" />
            </g>
          </g>
        </g>
      </g>

      {/*
        Le jour : le coin de la feuille n'est pas droit, donc son bord gauche ne
        suit pas le bras. Le cisaillement de 4° ecarte le haut de 230 x tan(4°),
        soit 16 px, et rien au niveau du coin controle. C'est ce coin de jour
        qu'on cherche en posant une equerre — il se referme quand l'angle est
        droit.
      */}
      <path className={styles.gap} d="M130 270 V40 H146 Z" fill="var(--dq-brand)" />

      <path className={styles.arm} d="M20 20 H130 V270 H20 Z" fill="var(--dq-ink)" />
      <path className={styles.blade} d="M20 270 H380 V380 H20 Z" fill="var(--dq-brand)" />

      {/*
        L'angle verifie : le signe qu'on trace sur un plan pour dire « controle ».

        En terre cuite et decolle du coin, contrairement a la marque. Deux
        raisons, et elles vont dans le meme sens : dans le coin exact il touchait
        le bras, de meme encre, et les deux se lisaient comme une seule masse —
        le dernier temps de la scene disparaissait. Et ici le signe ne compose
        pas la marque, il s'APPOSE sur un document : c'est le cas du sceau, ou
        l'angle est deja en terre cuite (`brand/seal.tsx`).
      */}
      {/* Le sceau suit le pointeur un peu plus que la feuille : pose dessus, il
          se lit legerement au-dessus d'elle — un rien de profondeur. */}
      <g className={styles.stampShift}>
        <rect className={styles.stamp} x="152" y="176" width="70" height="70" fill="var(--dq-brand)" />
      </g>
    </svg>
  )
}
