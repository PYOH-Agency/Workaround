import styles from './checking.module.css'

/**
 * La verification.
 *
 * Le pendant de `Squaring`, et son exact contraire de point de vue : la scene
 * pro montre l'artisan qui met son devis d'equerre, celle-ci montre le
 * demandeur qui LIT une attestation. L'attestation se presente, ses activites
 * se lisent une a une, chaque verdict tombe — et le sceau se pose a la fin.
 *
 * **Elle ne finit pas sur « tout va bien ».** Une des trois activites n'est pas
 * couverte, et c'est la these de la page : la reassurance n'est pas que
 * l'entreprise soit parfaite, c'est que vous le sachiez avant de signer. Une
 * scene qui cocherait trois lignes sur trois mentirait sur le produit et sur le
 * secteur.
 *
 * Trace plutot que capture d'ecran, comme cote pro : la page parle le
 * vocabulaire du document, pas celui du logiciel.
 *
 * Geometrie : un viewBox de 400 x 340, le meme cadre que `Squaring`, pour que
 * les deux accroches aient la meme assise. La feuille occupe 252 x 252 a
 * partir de (54, 26) ; le sceau deborde son coin inferieur droit — il s'appose
 * SUR le document, il n'est pas dedans.
 */

/** Les trois activites lues. La deuxieme n'est pas couverte, et c'est le sujet. */
const LINES = [
  { y: 116, width: 128, covered: true },
  { y: 158, width: 152, covered: false },
  { y: 200, width: 110, covered: true },
]

export function Checking() {
  return (
    <svg
      viewBox="0 0 400 340"
      className={`${styles.scene} h-auto w-full max-w-[26rem]`}
      /*
       * Decorative, comme `Squaring`, `Mark` et `Seal` : l'accroche et le
       * chapeau disent deja en toutes lettres ce que la scene montre. Lui
       * coller une description ferait lire une animation a qui ne la voit pas.
       */
      aria-hidden="true"
      focusable="false"
    >
      <g className={styles.sheet}>
        <rect
          x="54"
          y="26"
          width="252"
          height="252"
          fill="var(--dq-raised)"
          stroke="var(--dq-rule)"
        />

        {/* L'en-tete du document : raison sociale, puis numero de contrat. */}
        <rect x="78" y="52" width="104" height="9" fill="var(--dq-ink)" />
        <rect x="78" y="69" width="64" height="5" fill="var(--dq-rule)" />
        <rect x="78" y="92" width="204" height="1" fill="var(--dq-rule)" />
      </g>

      {LINES.map(({ y, width, covered }, index) => (
        <g key={y}>
          <rect
            className={`${styles.line} ${styles[`line${index + 1}`]}`}
            x="78"
            y={y}
            width={width}
            height="5"
            fill="var(--dq-rule)"
          />

          {/*
            Le verdict est un signe, pas une couleur : une coche et une croix.
            La teinte double le signe, elle ne le remplace pas — meme regle que
            `Badge`, ou le pictogramme est obligatoire.
          */}
          <g
            className={`${styles.verdict} ${styles[`verdict${index + 1}`]}`}
            style={{ transformOrigin: `${268}px ${y + 2}px` }}
          >
            {covered ? (
              <path
                d={`M259 ${y + 2} l6 6 l12 -13`}
                fill="none"
                stroke="var(--dq-verified)"
                strokeWidth="4"
                strokeLinecap="square"
              />
            ) : (
              <path
                d={`M259 ${y - 6} l17 17 M276 ${y - 6} l-17 17`}
                fill="none"
                stroke="var(--dq-danger)"
                strokeWidth="4"
                strokeLinecap="square"
              />
            )}
          </g>
        </g>
      ))}

      {/*
        Le sceau, repris tel quel de `brand/seal.tsx` a l'echelle : medaillon
        d'encre, equerre en reserve, carre de l'angle en terre cuite. Il deborde
        du document parce qu'il s'y APPOSE — c'est ce que fait un sceau.
      */}
      <g className={styles.seal}>
        <svg x="238" y="216" width="100" height="100" viewBox="0 0 48 48">
          <rect width="48" height="48" rx="11" fill="var(--dq-ink)" />
          <path d="M13 10 H21 V28 H38 V36 H13 Z" fill="var(--dq-card)" />
          <rect x="21" y="21" width="7" height="7" fill="var(--dq-brand)" />
        </svg>
      </g>
    </svg>
  )
}
