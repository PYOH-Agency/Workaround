import { SectionHeader } from '@/ui/molecules/section-header'
import { Stagger } from '@/ui/molecules/stagger'
import { StepCard } from '@/ui/molecules/step-card'

/**
 * Ce que le demandeur obtient, avant, pendant et apres.
 *
 * La page n'avait que des raisons de se mefier — la question de l'accroche,
 * puis « le piege ». Aucune section ne disait ce qu'on y gagne, et une page qui
 * n'enonce que le risque met en garde sans rassurer. C'est ce qui manquait a
 * la confiance : non pas un ton plus doux, mais une contrepartie.
 *
 * Le rang est numerote parce que l'ordre porte vraiment l'information — on
 * verifie avant de signer, jamais apres —, meme motif que la frise du chantier
 * cote pro. Les trois etapes correspondent a trois ecrans livres : la
 * verification, le suivi de chantier, le repertoire.
 *
 * La cadence de calepinage les pose une a une : c'est le geste du chantier, et
 * ces trois temps SONT un chantier vu du cote du client.
 */
export function After() {
  return (
    <section className="border-y border-rule bg-card">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="flex flex-col gap-8">
          <SectionHeader
            label="Avant, pendant, après"
            title="Vous n’êtes pas seul entre le devis et la garantie."
            lead="Un chantier dure des semaines et ses garanties, dix ans. Ce que vous vérifiez aujourd’hui vous reste acquis demain, sans rien avoir à classer."
          />

          <Stagger cols={3}>
            <StepCard step={1} title="Avant : vous vérifiez">
              Le SIRET suffit. Vous voyez les activités couvertes par son assurance, et celles qui
              ne le sont pas.
            </StepCard>
            <StepCard step={2} title="Pendant : vous suivez">
              Photos, avancement, factures, réception : le chantier s’écrit dans votre espace, et
              l’entreprise lit la même page que vous.
            </StepCard>
            <StepCard step={3} title="Après : vous gardez">
              Devis, factures, dates de garantie, et le répertoire des entreprises déjà venues chez
              vous — avec leur assurance d’aujourd’hui.
            </StepCard>
          </Stagger>
        </div>
      </div>
    </section>
  )
}
