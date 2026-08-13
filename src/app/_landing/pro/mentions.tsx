import { Heading } from '@/ui/atoms/heading'
import { Text } from '@/ui/atoms/text'

/**
 * Ce que ça vous evite.
 *
 * Le fait le plus dur de la page — une amende de 15 000 € — ne se dit plus en
 * texte courant : il se MONTRE, un chiffre qui pese, adosse a un filet terre
 * cuite, comme l'accent d'un avis d'infraction. L'explication de l'article se
 * tient a cote, a sa juste taille. C'est le pendant sombre du « 0 € » de la
 * section prix : deux chiffres encadrent la promesse — ce qu'un devis non
 * conforme coute, ce que l'outil coute.
 */
export function Mentions() {
  return (
    <section className="border-y border-rule bg-card">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,auto)_1fr] md:items-center md:gap-16">
          <div className="flex flex-col gap-2 border-l-4 border-brand pl-6">
            <Text size="label" tone="muted">
              Ce que ça vous évite
            </Text>
            <Heading level="figure" as="p">
              15 000 €
            </Heading>
            <Text size="sm" tone="muted">
              d’amende, par infraction constatée
            </Text>
          </div>

          <div className="flex flex-col gap-4">
            <Heading level={2}>Un devis sans mention d’assurance, et l’amende tombe.</Heading>
            <Text tone="soft">
              L’article L243-2 impose sur chaque devis le nom de l’assureur, la référence du
              contrat, les activités garanties et la zone couverte. On les écrit pour vous, une
              fois, et elles apparaissent partout.
            </Text>
          </div>
        </div>
      </div>
    </section>
  )
}
