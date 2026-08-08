import { Stagger } from '@/ui/molecules/stagger'
import { StepCard } from '@/ui/molecules/step-card'

/**
 * Pas de `SectionHeader` ici : le §11 de la spec ne donne que les trois
 * etapes pour cette section, sans etiquette ni titre — les cartes numerotees
 * portent la structure a elles seules.
 */
export function Steps() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <Stagger cols={3}>
        <StepCard step={1} title="Vous saisissez votre SIRET">
          Raison sociale, adresse, forme juridique : récupérées automatiquement.
        </StepCard>
        <StepCard step={2} title="Vous rédigez votre devis">
          TVA multi-taux, mentions obligatoires, PDF conforme.
        </StepCard>
        <StepCard step={3} title="Votre client signe">
          Par lien et code SMS. Horodaté, avec piste d’audit.
        </StepCard>
      </Stagger>
    </section>
  )
}
