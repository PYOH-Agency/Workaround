import { describe, expect, it } from 'vitest'
import { toCsv } from '@/domain/csv'

describe('toCsv', () => {
  it('rend un en-tete et une ligne simples', () => {
    expect(toCsv(['siret', 'canal'], [['12345678900012', 'sent']])).toBe(
      'siret;canal\r\n12345678900012;sent\r\n',
    )
  })

  it('n\'ecrit que l\'en-tete quand il n\'y a rien a exporter', () => {
    expect(toCsv(['siret', 'canal'], [])).toBe('siret;canal\r\n')
  })

  it('protege une valeur qui porte le separateur', () => {
    expect(toCsv(['nom'], [['Dupont; Fils']])).toBe('nom\r\n"Dupont; Fils"\r\n')
  })

  it('protege une valeur qui porte une virgule, meme si la virgule n\'est pas le separateur', () => {
    // Le point-virgule est le separateur retenu, mais une virgule dans une
    // valeur reste ambigue pour un tableur ouvert avec les reglages anglais :
    // on la protege quand meme, par prudence plutot que par necessite stricte.
    expect(toCsv(['nom'], [['Dupont, Fils']])).toBe('nom\r\n"Dupont, Fils"\r\n')
  })

  it('double les guillemets internes', () => {
    expect(toCsv(['nom'], [['Le "Roi" du carrelage']])).toBe(
      'nom\r\n"Le ""Roi"" du carrelage"\r\n',
    )
  })

  it('protege une valeur qui porte un retour a la ligne', () => {
    expect(toCsv(['note'], [['ligne un\nligne deux']])).toBe(
      'note\r\n"ligne un\nligne deux"\r\n',
    )
  })

  it('rend plusieurs lignes, chacune terminee par CRLF', () => {
    expect(
      toCsv(
        ['siret', 'canal'],
        [
          ['11111111100011', 'sent'],
          ['22222222200022', 'copied'],
        ],
      ),
    ).toBe('siret;canal\r\n11111111100011;sent\r\n22222222200022;copied\r\n')
  })

  it('protege une valeur vide identiquement a une absence de valeur : les deux restent un champ vide', () => {
    expect(toCsv(['siret', 'note'], [['12345678900012', '']])).toBe(
      'siret;note\r\n12345678900012;\r\n',
    )
  })

  it('echappe une valeur qui commence par un guillemet sans porter de separateur', () => {
    expect(toCsv(['nom'], [['"Le Roi"']])).toBe('nom\r\n"""Le Roi"""\r\n')
  })
})
