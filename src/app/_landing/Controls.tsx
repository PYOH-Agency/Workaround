import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import styles from './motion.module.css'

/**
 * Les trois controles.
 *
 * Pas de 01 / 02 / 03 : ce n'est pas une sequence. Les trois tiennent en meme
 * temps ou le document ne vaut rien — les numeroter mentirait sur ce qu'ils
 * sont. Leur marqueur est donc l'angle verifie, le meme signe que la scene
 * d'accroche et que la marque.
 *
 * Aucune promesse au-dela de ce que le produit sait : « attestation relevee »,
 * jamais « assurance a jour ». Nous connaissons la date d'un document, pas
 * l'etat d'un contrat (spec §4.5).
 */

const CONTROLS = [
  {
    title: 'Les mentions obligatoires',
    body: 'L’arrêté du 24 janvier 2017 impose une liste au devis de travaux. D’équerre la tient à jour et vous dit ce qui manque avant l’envoi, pas après le contrôle — où l’oubli se chiffre à 3 000 € pour un artisan, 15 000 € pour une société.',
  },
  {
    title: 'L’assurance, rattachée au métier',
    body: 'Votre attestation de décennale est relevée, datée, et rattachée aux activités qu’elle couvre. Pas « assurée » en général : assurée pour ce que vous faites, et jusqu’à quand.',
  },
  {
    title: 'La signature, horodatée',
    body: 'Le client ouvre un lien, reçoit un code par SMS, signe. Le devis est scellé avec son contenu exact et l’heure de la signature. Ce qui a été signé ne bouge plus.',
  },
]

/**
 * Le signe de l'angle droit verifie, reduit a un coin de carte.
 *
 * Le trait est en `field` et non en `rule` : un filet de separateur disparait a
 * cette taille, et le marqueur se lisait comme une bavure plutot que comme un
 * signe.
 */
function AngleMark() {
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true" focusable="false">
      <path d="M6 4 V30 H32" fill="none" stroke="var(--dq-field)" strokeWidth="2" />
      <rect className={styles.angle} x="6" y="21" width="9" height="9" fill="var(--dq-brand)" />
    </svg>
  )
}

export function Controls() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
      <div className={`${styles.reveal} flex max-w-xl flex-col gap-4`}>
        <Text size="label" tone="muted" as="div">
          Ce que l’équerre contrôle
        </Text>
        <Heading level={2}>Trois angles, sur chaque document que vous sortez.</Heading>
      </div>

      <ul className="mt-12 grid gap-px overflow-hidden rounded-card border border-rule bg-rule md:grid-cols-3">
        {CONTROLS.map(({ title, body }) => (
          <li key={title} className={`${styles.control} ${styles.reveal} bg-card p-6 md:p-8`}>
            <div className="flex flex-col gap-4">
              <AngleMark />
              <Heading level={3}>{title}</Heading>
              <Text size="sm" tone="soft">
                {body}
              </Text>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
