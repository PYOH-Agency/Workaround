import { SectionHeader } from '@/ui/molecules/section-header'
import { Stagger } from '@/ui/molecules/stagger'
import { StepCard } from '@/ui/molecules/step-card'

/**
 * Les trois etapes du demarrage (spec landing §11), desormais precedees d'une
 * intro en split : le titre a gauche, ce qu'il faut savoir a droite, puis les
 * cartes en dessous. Sans elle, la section ouvrait abruptement sur trois cartes
 * numerotees, sans dire de quoi elles etaient les etapes.
 *
 * Le `as="h3"` des cartes suit : l'intro porte le `h2` de la section, les
 * etapes se rangent un cran en dessous, et le plan du document reste juste.
 */
export function Steps() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12">
      <SectionHeader
        layout="split"
        label="Prise en main"
        title="Trois étapes, et vous facturez."
        lead="Aucune installation, aucun paramétrage. Votre SIRET renseigne l’entreprise, et votre premier devis part dans la foulée."
      />

      <div className="mt-10">
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
      </div>
    </section>
  )
}
