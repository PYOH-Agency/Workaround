import { ButtonLink } from '@/ui/atoms/button-link'
import { SectionHeader } from '@/ui/molecules/section-header'
import { Text } from '@/ui/atoms/text'

/**
 * Trouver, et pas seulement verifier.
 *
 * **L'annuaire existe, il est public et il est indexe** — `/annuaire`, livre au
 * jalon M4 — et cette page ne le mentionnait nulle part. Un demandeur qui
 * arrive ici sans SIRET en main n'avait donc rien a faire : la page ne servait
 * que ceux qui tenaient deja un devis.
 *
 * Ce n'est pas la mise en relation exclue de P1 par le §4 du socle : aucun
 * depot de projet, aucun appel d'offres, aucune commission. C'est une liste
 * d'entreprises dont la couverture a ete verifiee, et l'artisan y figure sans
 * l'avoir achete — la meme regle que celle enoncee sur la page pro.
 *
 * Le bouton est en contour et non en terre cuite : la page garde une seule
 * action de conversion, la verification par SIRET. Deux boutons pleins
 * l'auraient mise en concurrence avec elle-meme.
 */
export function Directory() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="flex flex-col gap-6 sm:items-start">
        <SectionHeader
          label="Pas encore d’entreprise en tête ?"
          title="Trouvez-en une déjà vérifiée."
          lead="Dites ce que vous cherchez et dans quelle commune. Chaque entreprise affichée est assurée pour cette activité-là — vérifiée sur son attestation, pas déclarée sur parole."
        />
        <ButtonLink href="/annuaire" tone="secondary" size="lg">
          Trouver un artisan
        </ButtonLink>
        <Text size="sm" tone="muted">
          Aucun classement acheté. Nous ne prenons aucune commission.
        </Text>
      </div>
    </section>
  )
}
