import { ButtonLink } from '@/ui/atoms/button-link'
import { SectionHeader } from '@/ui/molecules/section-header'
import { ONBOARDING_HREF } from '../onboarding-href'

export function Pricing() {
  return (
    <section className="border-y border-rule bg-card">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="flex flex-col gap-6">
          <SectionHeader
            label="Ce que ça coûte"
            title="L’outil est gratuit. Pour toujours."
            lead="Devis, factures, signature, page publique : gratuits à vie, sans limite de volume. L’abonnement Pro ne concerne que ce qui vient après — équipe, planning, situations de travaux, relances d’impayés."
          />
          <ButtonLink href={ONBOARDING_HREF} size="lg">
            Commencer
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
