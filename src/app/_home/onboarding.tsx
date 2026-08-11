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
 *
 * **Conditionnee par capacite, comme le reste de l'accueil (spec §3).** Les
 * trois etapes exigent toutes `owner` — etablir un devis, modifier les
 * mentions, deposer l'attestation. Un compagnon d'une entreprise neuve n'en a
 * aucune : lui montrer les trois boutons serait lui montrer trois refus
 * differes au serveur.
 */
export function Onboarding({
  legalMentionsDone,
  certificateDone,
  canWriteQuote,
  canManageLegal,
}: {
  legalMentionsDone: boolean
  /**
   * Le depot, pas la validation.
   *
   * Une attestation relue par le backoffice devient publique ; en attendant,
   * le geste — deposer — est deja fait, et c'est lui que cette etape decrit.
   */
  certificateDone: boolean
  /** `quote.write` : sans elle, "Établir un devis" n'est qu'un refus differe. */
  canWriteQuote: boolean
  /** `legal.write` : gouverne a la fois les mentions et l'attestation. */
  canManageLegal: boolean
}) {
  if (!canWriteQuote && !canManageLegal) {
    // Rien a proposer sur cette bande-la — mais une page nue laisse croire a
    // une panne. `agenda.manage` reste a ce role : c'est un geste reel, pas
    // un lot de consolation, et la spec interdit d'annoncer ce qui manque
    // plutot que ce qui reste (§3).
    return (
      <section className="flex flex-col gap-4">
        <Heading level={1}>L’entreprise vient d’être créée</Heading>
        <Text tone="soft">Retrouvez dès maintenant vos rendez-vous dans l’agenda.</Text>
        <ButtonLink href="/agenda">Voir l’agenda</ButtonLink>
      </section>
    )
  }

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
        {canManageLegal ? (
          <StepCard step={1} title="Vos mentions obligatoires">
            {legalMentionsDone
              ? 'Renseignées. Vos devis sont conformes.'
              : 'Sans elles, un devis adressé à un particulier n’est pas conforme.'}
          </StepCard>
        ) : null}
        {canManageLegal ? (
          <StepCard step={2} title="Votre attestation décennale">
            {certificateDone
              ? 'Déposée. En cours de vérification.'
              : 'Elle rend votre page publique visible par vos clients.'}
          </StepCard>
        ) : null}
        {canWriteQuote ? (
          <StepCard step={3} title="Votre premier devis">
            C’est là que tout commence.
          </StepCard>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        {canWriteQuote ? <ButtonLink href="/devis/nouveau">Établir un devis</ButtonLink> : null}
        {canManageLegal && !legalMentionsDone ? (
          <ButtonLink href="/mentions" tone="raised">
            Compléter mes mentions
          </ButtonLink>
        ) : null}
        {canManageLegal && !certificateDone ? (
          <ButtonLink href="/verification" tone="raised">
            Déposer mon attestation
          </ButtonLink>
        ) : null}
      </div>
    </section>
  )
}
