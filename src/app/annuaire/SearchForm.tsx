import { Button } from '@/ui/atoms/button'
import { Input } from '@/ui/atoms/input'
import { Select } from '@/ui/atoms/select'
import { Field } from '@/ui/molecules/field'

export interface NeedOption {
  slug: string
  label: string
}

/**
 * Le formulaire de recherche.
 *
 * En `method="get"` deliberement : une recherche doit etre partageable, mise en
 * favori et indexable. Une action serveur produirait une URL muette, ce qui
 * priverait l'annuaire de la seule chose qu'il apporte a l'artisan — etre
 * trouve.
 */
export function SearchForm({
  needs,
  besoin,
  zone,
}: {
  needs: NeedOption[]
  besoin?: string
  zone?: string
}) {
  return (
    /*
      Le bouton sur sa propre ligne, et non aligne aux champs.
      Le champ « Ou » porte un texte d'aide sous lui : sa boite descend plus bas
      que celle du select, si bien qu'un `items-end` posait le bouton au niveau
      de l'aide, un cran sous les deux champs. Le descendre d'une ligne aligne
      ce qui doit l'etre — les deux champs entre eux — et laisse le bouton la ou
      le regard finit sa lecture.
    */
    <form method="get" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-64 flex-1">
          <Field label="Votre besoin" required>
            {(p) => (
              <Select {...p} name="besoin" defaultValue={besoin ?? ''}>
                <option value="" disabled>
                  Choisir…
                </option>
                {needs.map((need) => (
                  <option key={need.slug} value={need.slug}>
                    {need.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {/* `basis-48` plutot que `w-48` : un code postal reste court, mais le
            champ s'etire au lieu de laisser un trou quand il est seul sur sa ligne. */}
        <div className="min-w-48 flex-1 basis-48">
          <Field label="Où" help="Code postal ou commune" required>
            {(p) => <Input {...p} name="zone" defaultValue={zone ?? ''} placeholder="33000" />}
          </Field>
        </div>
      </div>

      {/* Pleine largeur sur telephone, ajuste a son texte des qu'il y a la place. */}
      <div className="flex flex-col sm:items-start">
        <Button type="submit">Chercher</Button>
      </div>
    </form>
  )
}
