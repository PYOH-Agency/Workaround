import { Text } from '@/ui/atoms/text'
import { SectionHeader } from '@/ui/molecules/section-header'

export function Notebook() {
  return (
    <section className="border-y border-rule bg-card">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="flex flex-col gap-4">
          <SectionHeader
            label="Bientôt"
            title="Le carnet de votre logement."
            lead={
              <>
                Chaque intervention, chaque équipement posé, chaque garantie en cours —
                rassemblés, et à vous. Votre espace s’ouvrira{' '}
                <strong>à la signature de votre prochain devis</strong> : rien à créer, rien à
                retenir.
              </>
            }
          />
          <Text size="sm" tone="muted">
            Aucune inscription pour l’instant. Nous ne collectons pas votre adresse.
          </Text>
        </div>
      </div>
    </section>
  )
}
