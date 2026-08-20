/**
 * La mise en route de l'artisan : trois etapes, et une seule redaction.
 *
 * Ces trois lignes sont lues par deux ecrans que tout separe — l'etape 2 de
 * `/creer-mon-entreprise`, avant meme que l'entreprise n'existe, puis la mise
 * en route de l'accueil, une fois entre. **C'est la meme liste, et c'est tout
 * l'interet** : ce qui est annonce avant le lien magique doit etre exactement
 * ce qui attend apres. « Personne n'est perdu parce que personne n'est
 * surpris » (A1 §3.2, A2 §3.1).
 *
 * Deux redactions ont deja diverge une fois — l'inscription annoncait les
 * groupes de mentions, l'accueil montrait autre chose. Le besoin est donc
 * remonte ici : `check:feature-isolation` interdit a l'inscription de lire
 * l'accueil, et `src/domain` ne touche a aucune donnee.
 *
 * Ce qui n'est PAS ici : le texte explicatif de chaque carte, qui depend de
 * l'avancement reel et n'appartient qu'a l'accueil.
 */

export type OnboardingStepKey = 'mentions' | 'certificate' | 'quote'

export interface OnboardingStep {
  key: OnboardingStepKey
  /** Le libelle, mot pour mot, des deux cotes du lien magique. */
  title: string
  /** L'ecran qui traite l'etape. Chacune en mene a un — c'est ce qui les rend actionnables. */
  href: string
  /**
   * Ce qu'il reste a y faire, tant que rien n'est commence.
   *
   * Propre a l'inscription, ou les trois sont a faire par construction. Le
   * verbe suit l'etape : on complete des mentions, on etablit un devis.
   */
  pendingLabel: string
}

export const ONBOARDING_STEP: Record<OnboardingStepKey, OnboardingStep> = {
  mentions: {
    key: 'mentions',
    title: 'Vos mentions obligatoires',
    href: '/mentions',
    pendingLabel: 'à compléter',
  },
  certificate: {
    key: 'certificate',
    title: 'Votre attestation décennale',
    href: '/verification',
    pendingLabel: 'à déposer',
  },
  quote: {
    key: 'quote',
    title: 'Votre premier devis',
    href: '/devis/nouveau',
    pendingLabel: 'à établir',
  },
}

/**
 * L'ordre d'affichage, et il compte : deux ordres differents de part et
 * d'autre de l'inscription desorienteraient autant que deux libelles.
 *
 * Il porte aussi la numerotation des cartes de l'accueil — la troisieme etape
 * reste « 3 » meme quand les deux premieres sont hors de portee du role.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  ONBOARDING_STEP.mentions,
  ONBOARDING_STEP.certificate,
  ONBOARDING_STEP.quote,
]
