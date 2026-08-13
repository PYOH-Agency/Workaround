import { PrinciplePanel } from '@/ui/organisms/principle-panel'
import { SectionHeader } from '@/ui/molecules/section-header'

export function Principles() {
  return (
    <section className="border-y border-rule bg-card">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-6">
          <SectionHeader title="Ce que nous ne ferons jamais." />
          <PrinciplePanel
            principles={[
              'Nous ne vendrons jamais votre place dans un classement.',
              'Nous ne prendrons jamais de commission sur vos propres clients.',
            ]}
          />
        </div>
      </div>
    </section>
  )
}
