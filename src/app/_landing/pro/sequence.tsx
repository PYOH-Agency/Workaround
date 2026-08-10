import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'
import { Reveal } from '@/ui/molecules/reveal'
import { SectionHeader } from '@/ui/molecules/section-header'
import { Stagger } from '@/ui/molecules/stagger'

/**
 * Du devis a la reception.
 *
 * Le seul endroit de la page ou le rang est numerote — parce qu'ici l'ordre
 * porte vraiment l'information : on ne receptionne pas avant d'avoir signe, et
 * la facture ne part pas avant la reception. Ailleurs, numeroter serait un
 * ornement qui pretend etre une structure.
 *
 * Presentation en frise et non en cartes, contrairement a `Steps` : les trois
 * cartes disent comment on demarre, cette ligne-ci dit comment un chantier se
 * deroule. Leur donner la meme forme les ferait lire comme deux fois la meme
 * chose.
 *
 * **La frise se pose au calepinage.** Elle s'en passait, faute d'un `Stagger` a
 * cinq colonnes, et parce qu'une cadence de plus ne valait pas d'elargir le
 * composant. Ce raisonnement tenait tant que la cadence n'etait qu'un
 * agrement : ici elle dit quelque chose de vrai — un chantier avance pas a pas,
 * et la signature precede la reception. C'est le geste du chantier, comme la
 * mise d'equerre de l'accroche est celui du contrat.
 *
 * Les deux cohabitent sans se concurrencer : `Reveal` porte le titre, `Stagger`
 * la frise. C'est la regle du regime — un geste, une cadence.
 */
const STEPS = [
  { title: 'Devis', body: 'Rédigé aux mentions à jour, envoyé par lien.' },
  { title: 'Signature', body: 'Code SMS, horodatage, contenu scellé.' },
  { title: 'Fil de chantier', body: 'Photos et avancement, publiés au client.' },
  { title: 'Réception', body: 'Déclarée par le maître d’ouvrage, avec réserves.' },
  { title: 'Facture', body: 'Rattachée au devis signé, avec le solde dû.' },
]

export function Sequence() {
  return (
    <section className="border-y border-rule bg-card">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <Reveal>
          <SectionHeader
            label="Du devis à la réception"
            title="Le chantier laisse une trace, et le client la lit."
            lead="Un seul dossier, ouvert au signataire. Il n’a rien à installer, rien à créer : le lien qu’il a reçu pour signer reste celui qui lui montre où en est son chantier."
          />

        </Reveal>

        <div className="mt-12">
          <Stagger cols={5} as="ol">
            {STEPS.map(({ title, body }, index) => (
              <div key={title} className="flex flex-col gap-3">
                {/*
                  Le filet est decoratif et ne porte donc aucune information
                  seul : le rang est ecrit en toutes lettres juste en dessous.
                */}
                <div aria-hidden="true" className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 bg-brand" />
                  <span className="h-px flex-1 bg-rule" />
                </div>
                <Text size="label" tone="muted" as="div">
                  Étape {index + 1}
                </Text>
                <Heading level={3}>{title}</Heading>
                <Text size="sm" tone="soft">
                  {body}
                </Text>
              </div>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  )
}
