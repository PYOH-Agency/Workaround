import { SectionHeader } from '@/ui/molecules/section-header'

export function Mentions() {
  return (
    <section className="border-y border-rule bg-card">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <SectionHeader
          label="Ce que ça vous évite"
          title="Un devis sans mention d’assurance coûte 15 000 €."
          lead="L’article L243-2 impose sur chaque devis le nom de l’assureur, la référence du contrat, les activités garanties et la zone couverte. Par infraction constatée. On les écrit pour vous, une fois, et elles apparaissent partout."
        />
      </div>
    </section>
  )
}
