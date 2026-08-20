import { ONBOARDING_STEP, ONBOARDING_STEPS, type OnboardingStepKey } from '@/domain/onboarding-steps'
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

  /**
   * Ce que l'accueil ajoute a la liste partagee : la capacite qu'exige
   * l'etape, et la phrase qui depend de son avancement.
   *
   * Les titres et l'ordre, eux, viennent de `ONBOARDING_STEPS` — ce sont les
   * memes que ceux annonces a l'inscription, et ils ne doivent pas pouvoir
   * diverger.
   */
  const stepState: Record<OnboardingStepKey, { allowed: boolean; note: string }> = {
    mentions: {
      allowed: canManageLegal,
      note: legalMentionsDone
        ? 'Renseignées. Vos devis sont conformes.'
        : 'Sans elles, un devis adressé à un particulier n’est pas conforme.',
    },
    certificate: {
      allowed: canManageLegal,
      note: certificateDone
        ? 'Déposée. En cours de vérification.'
        : 'Elle rend votre page publique visible par vos clients.',
    },
    quote: { allowed: canWriteQuote, note: 'C’est là que tout commence.' },
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
        {ONBOARDING_STEPS.map((step, index) =>
          stepState[step.key].allowed ? (
            <StepCard key={step.key} step={index + 1} title={step.title}>
              {stepState[step.key].note}
            </StepCard>
          ) : null,
        )}
      </div>

      {/*
        Les boutons ne suivent pas l'ordre des cartes : le devis passe devant,
        parce que c'est lui qui fait basculer l'accueil. Et une etape faite ne
        garde pas son bouton — un devis, lui, se reetablit toujours.
      */}
      <div className="flex flex-wrap gap-3">
        {canWriteQuote ? (
          <ButtonLink href={ONBOARDING_STEP.quote.href}>Établir un devis</ButtonLink>
        ) : null}
        {canManageLegal && !legalMentionsDone ? (
          <ButtonLink href={ONBOARDING_STEP.mentions.href} tone="raised">
            Compléter mes mentions
          </ButtonLink>
        ) : null}
        {canManageLegal && !certificateDone ? (
          <ButtonLink href={ONBOARDING_STEP.certificate.href} tone="raised">
            Déposer mon attestation
          </ButtonLink>
        ) : null}
      </div>
    </section>
  )
}
