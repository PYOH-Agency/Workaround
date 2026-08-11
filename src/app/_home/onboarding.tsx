import { ButtonLink } from '@/ui/atoms/button-link'
import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { StepCard } from '@/ui/molecules/step-card'

/**
 * L'accueil tant qu'aucun devis n'existe.
 *
 * Un accueil complet servi a un nouvel inscrit est un mur de zeros et de
 * bandes vides — le pire premier contact possible avec un outil. La bascule
 * se fait sur l'existence d'un devis et non sur l'achevement des trois etapes
 * — un artisan qui a etabli un devis a compris l'outil, meme s'il n'a pas
 * depose son attestation : elle reviendra d'elle-meme dans la file.
 */
export function Onboarding({
  legalMentionsDone,
  certificateDone,
}: {
  legalMentionsDone: boolean
  /**
   * Le depot, pas la validation.
   *
   * Une attestation relue par le backoffice devient publique ; en attendant,
   * le geste — deposer — est deja fait, et c'est lui que cette etape decrit.
   */
  certificateDone: boolean
}) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Heading level={1}>Trois choses, et vous êtes prêt</Heading>
        <Text tone="soft">
          Vos devis et vos factures sont gratuits à vie. Il reste à les rendre conformes.
        </Text>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* `StepCard` prend ses enfants, pas une prop `description`. */}
        <StepCard step={1} title="Vos mentions obligatoires">
          {legalMentionsDone
            ? 'Renseignées. Vos devis sont conformes.'
            : 'Sans elles, un devis adressé à un particulier n’est pas conforme.'}
        </StepCard>
        <StepCard step={2} title="Votre attestation décennale">
          {certificateDone
            ? 'Déposée. En cours de vérification.'
            : 'Elle rend votre page publique visible par vos clients.'}
        </StepCard>
        <StepCard step={3} title="Votre premier devis">
          C’est là que tout commence.
        </StepCard>
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/devis/nouveau">Établir un devis</ButtonLink>
        {legalMentionsDone ? null : (
          <ButtonLink href="/mentions" tone="raised">
            Compléter mes mentions
          </ButtonLink>
        )}
        {certificateDone ? null : (
          <ButtonLink href="/verification" tone="raised">
            Déposer mon attestation
          </ButtonLink>
        )}
      </div>
    </section>
  )
}
