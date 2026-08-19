import { PrinciplePanel } from '@/ui/organisms/principle-panel'
import { SectionHeader } from '@/ui/molecules/section-header'

/**
 * Sur la craie, et non plus sur la carte.
 *
 * La page alterne desormais craie et carte jusqu'a sa bande d'encre finale.
 * Deux sections de carte a la suite — ce qu'on avait ici et sur « la suite » —
 * ne se distinguent d'un aplat unique par rien : 2 % separent les deux
 * surfaces. L'alternance ne se voit que si elle est tenue.
 */
export function Principles() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="flex flex-col gap-6">
        <SectionHeader title="Ce que nous ne ferons jamais." />
        <PrinciplePanel
          principles={[
            'Nous ne vendrons jamais votre place dans un classement.',
            'Nous ne prendrons jamais de commission sur vos propres clients.',
          ]}
        />
      </div>
    </section>
  )
}
