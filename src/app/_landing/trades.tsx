import { Text } from '@/ui/atoms/text'
import styles from './trades.module.css'

/**
 * Le defile des activites.
 *
 * **Ce qu'il fait pour la page.** C'est le seul mouvement continu des deux
 * pages d'entree : tout le reste ne bouge qu'au chargement, au survol ou au
 * defilement, si bien qu'une page laissee immobile sous les yeux d'un visiteur
 * qui reflechit ne bougeait plus du tout. Une bande qui avance suffit a la
 * garder vivante, et elle dit quelque chose de vrai pendant qu'elle avance.
 *
 * **Ce qu'il dit.** Ce sont les activites que l'attestation decennale nomme, et
 * c'est exactement la maille a laquelle le produit verifie la couverture. La
 * liste n'est donc pas un ornement : elle montre la granularite de la promesse.
 *
 * Aucune n'est presentee comme un client, un secteur couvert ou un chiffre.
 * Une bande de logos serait le geste attendu ici, et il serait mensonger.
 */
const TRADES = [
  'Maçonnerie',
  'Couverture',
  'Plomberie',
  'Électricité',
  'Menuiserie',
  'Plâtrerie',
  'Peinture',
  'Carrelage',
  'Chauffage',
  'Zinguerie',
  'Étanchéité',
  'Terrassement',
  'Isolation',
  'Serrurerie',
]

/**
 * Le ruban est duplique une fois, et la translation s'arrete a la moitie : la
 * seconde copie prend la place de la premiere a l'image ou le cycle boucle,
 * donc la jointure ne se voit pas. `aria-hidden` sur la copie — un lecteur
 * d'ecran n'a aucune raison d'entendre la liste deux fois.
 */
function Ribbon({ hidden }: { hidden?: boolean }) {
  return (
    <span className={styles.ribbon} aria-hidden={hidden ? 'true' : undefined}>
      {TRADES.map((trade) => (
        <span key={trade} className={styles.item}>
          <span aria-hidden="true" className={`${styles.tick} bg-brand`} />
          <Text size="sm" tone="soft" as="span">
            {trade}
          </Text>
        </span>
      ))}
    </span>
  )
}

export function Trades() {
  return (
    <section className="border-y border-rule bg-card">
      <div className="flex flex-col gap-3 py-6">
        <div className="mx-auto w-full max-w-5xl px-6">
          <Text size="label" tone="muted">
            Couverture vérifiée activité par activité
          </Text>
        </div>
        <div className={styles.window}>
          <div className={styles.track}>
            <Ribbon />
            <Ribbon hidden />
          </div>
        </div>
      </div>
    </section>
  )
}
