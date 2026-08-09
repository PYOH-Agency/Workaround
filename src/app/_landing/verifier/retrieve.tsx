import { QuoteLinkForm } from '@/ui/organisms/quote-link-form'
import { SectionHeader } from '@/ui/molecules/section-header'

export function Retrieve() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="flex flex-col gap-6">
        <SectionHeader
          label="Vous attendiez un devis ?"
          title="On vous renvoie le lien."
          lead="Le devis vous a été adressé par e-mail et par SMS. Si vous ne le retrouvez pas, saisissez l’adresse à laquelle il a été envoyé."
        />
        <QuoteLinkForm />
      </div>
    </section>
  )
}
