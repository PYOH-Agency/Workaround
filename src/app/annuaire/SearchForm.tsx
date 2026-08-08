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
    <form method="get" className="flex flex-wrap items-end gap-4">
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

      <div className="w-48">
        <Field label="Où" help="Code postal ou commune" required>
          {(p) => <Input {...p} name="zone" defaultValue={zone ?? ''} placeholder="33000" />}
        </Field>
      </div>

      <Button type="submit">Chercher</Button>
    </form>
  )
}
