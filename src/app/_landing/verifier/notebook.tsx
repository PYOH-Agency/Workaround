import { Text } from '@/ui/atoms/text'
import { SectionHeader } from '@/ui/molecules/section-header'

/**
 * Le carnet du logement.
 *
 * **Cette section annoncait « Bientot » une chose qui existe.** L'espace du
 * demandeur est livre depuis M6 : `mes-logements`, le dossier de chaque
 * chantier, le repertoire. Annoncer comme a venir ce qui est deja la est le
 * defaut le plus couteux qu'une page de confiance puisse porter — un visiteur
 * qui le decouvre ensuite se demande ce que la page dit d'autre de faux.
 *
 * Ce qui reste vrai, et qui est dit ici : l'espace **s'ouvre a la signature**.
 * Ce n'est pas une file d'attente, c'est une consequence de la decision du §10
 * du socle — aucun compte a creer, aucune adresse collectee avant qu'un devis
 * ne soit signe.
 */
export function Notebook() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="flex flex-col gap-4">
        <SectionHeader
          label="Votre espace"
          title="Le carnet de votre logement s’ouvre tout seul."
          lead={
            <>
              Chaque chantier signé s’y range de lui-même : son suivi, ses documents, ses dates de
              garantie, et les entreprises déjà intervenues chez vous. Il s’ouvre{' '}
              <strong>à la signature de votre prochain devis</strong> — rien à créer, rien à
              retenir.
            </>
          }
        />
        <Text size="sm" tone="muted">
          Aucune inscription, et aucune liste d’attente : nous ne collectons pas votre adresse
          avant qu’un devis ne vous soit adressé.
        </Text>
      </div>
    </section>
  )
}
