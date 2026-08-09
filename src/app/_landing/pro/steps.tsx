import { Stagger } from '@/ui/molecules/stagger'
import { StepCard } from '@/ui/molecules/step-card'

/**
 * Pas de `SectionHeader` ici : le §11 de la spec ne donne que les trois
 * etapes pour cette section, sans etiquette ni titre — les cartes numerotees
 * portent la structure a elles seules.
 *
 * D'ou le `as="h2"` : sans titre de section, un `h3` se rattacherait au `h2`
 * qui precede — « Un devis sans mention d'assurance coute 15 000 € ». Le plan
 * du document annoncerait alors les trois etapes comme un detail de cet
 * avertissement. Au niveau 2, chacune est ce qu'elle est : une etape de meme
 * rang que les autres sections de la page.
 */
export function Steps() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <Stagger cols={3}>
        <StepCard step={1} as="h2" title="Vous saisissez votre SIRET">
          Raison sociale, adresse, forme juridique : récupérées automatiquement.
        </StepCard>
        <StepCard step={2} as="h2" title="Vous rédigez votre devis">
          TVA multi-taux, mentions obligatoires, PDF conforme.
        </StepCard>
        <StepCard step={3} as="h2" title="Votre client signe">
          Par lien et code SMS. Horodaté, avec piste d’audit.
        </StepCard>
      </Stagger>
    </section>
  )
}
