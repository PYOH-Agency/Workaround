type CheckboxProps = Omit<React.ComponentProps<'input'>, 'className' | 'style' | 'type'>

/**
 * La case fait 20 px, ce qui est en dessous de la cible tactile de 44 px.
 *
 * Ce n'est pas un oubli : c'est l'etiquette cliquable qui porte la cible, et
 * c'est le role de `Field` en variante `checkbox` de l'etendre. Grossir la case
 * elle-meme donnerait une case laide sans regler le probleme de la zone de clic.
 */
export function Checkbox(props: CheckboxProps) {
  return (
    <input
      {...props}
      type="checkbox"
      className="size-5 shrink-0 rounded-badge border border-field accent-primary"
    />
  )
}
