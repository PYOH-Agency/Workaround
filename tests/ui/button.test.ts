import { describe, it, expect } from 'vitest'
import { buttonStyle } from '@/ui/atoms/button'

describe('les tons du bouton', () => {
  it('pose un bouton raised sur une surface elevee et un bord soutenu', () => {
    // Sur un ecran dense, quatre boutons a fond transparent ne se lisent plus
    // comme des commandes. Le `raised` les rend tangibles sans les assombrir.
    const style = buttonStyle('raised', 'md')

    expect(style).toContain('bg-raised')
    expect(style).toContain('border-field')
  })

  it('garde la cible tactile de 44 px', () => {
    expect(buttonStyle('raised', 'md')).toContain('min-h-11')
  })

  it('laisse la terre cuite au seul ton conversion', () => {
    // Un primaire orange a cote d'un danger rouge est une erreur de clic qui
    // coute une facture : `raised` ne doit pas rouvrir cette porte.
    expect(buttonStyle('raised', 'md')).not.toContain('conversion')
  })
})
