import { Text } from '@/ui/atoms/text'
import { cn } from '@/ui/cn'

/**
 * A quoi ressemble un devis — sans qu'aucun devis existe.
 *
 * **Une illustration, jamais une ligne de tableau** (spec A2 §5). C'est la
 * reponse a « enseigner sans donnees fictives » : aucune ligne n'entre en base,
 * donc rien ici ne peut remonter dans `passport-metrics`, entrer dans le taux
 * affiche publiquement, ni finir envoye a un vrai client (spec §2.2). Un devis
 * de demonstration, meme marque comme tel, aurait exige que chaque lecture s'en
 * souvienne — et une seule qui l'oublie fausse un chiffre public.
 *
 * **Aucun montant, pas meme faux.** Les prix sont des barres. Ce qu'il y a a
 * apprendre est la forme — un objet, des prestations, un total —, pas un
 * chiffre ; et une barre ne peut pas se lire comme un tarif pratique.
 *
 * Le mot « Exemple » est visible, pas `sr-only` : il doit lever le doute pour
 * celui qui regarde autant que pour celui qui ecoute.
 *
 * Colocalise plutot que dans `src/ui` : un seul ecran le lit, comme `WeekGrid`
 * ou `CopyField` avant lui.
 */
export function QuoteSketch() {
  return (
    <div className="w-full max-w-64 rounded-card border border-rule bg-raised p-4">
      <div className="flex flex-col gap-3">
        <Text size="label" tone="muted" as="span">
          Exemple
        </Text>

        <div className="flex items-baseline justify-between gap-3">
          <Text size="sm" as="span">
            <strong>Devis</strong>
          </Text>
          <Bar width="w-10" />
        </div>

        {/*
          Trois prestations : deux se liraient comme une paire, quatre
          allongeraient l'apercu sous la hauteur du texte qu'il accompagne.
        */}
        <div className="flex flex-col gap-2 border-t border-rule pt-3">
          {['Dépose de l’ancien ballon', 'Fourniture du chauffe-eau', 'Pose et raccordement'].map(
            (line) => (
              <div key={line} className="flex items-baseline justify-between gap-3">
                <Text size="sm" tone="soft" as="span">
                  {line}
                </Text>
                <Bar width="w-8" />
              </div>
            ),
          )}
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t border-rule pt-3">
          <Text size="sm" as="span">
            <strong>Total TTC</strong>
          </Text>
          <Bar width="w-12" />
        </div>
      </div>
    </div>
  )
}

/**
 * Un montant qu'on ne dit pas.
 *
 * `aria-hidden` : a l'oreille, « barre grise » n'apprend rien de plus que le
 * libelle qui la precede. Le prix est justement ce que cet apercu refuse de
 * donner, et un lecteur d'ecran ne doit pas entendre un chiffre la ou l'oeil
 * n'en voit pas.
 */
function Bar({ width }: { width: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-block h-2 shrink-0 rounded-badge bg-rule', width)} />
  )
}
