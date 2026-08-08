import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/** Fichiers suivis par git dont l'extension figure dans `extensions`. */
export function trackedFiles(extensions) {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 26 })
    .split('\0')
    .filter((file) => file && extensions.some((extension) => file.endsWith(extension)))
}

export const read = (file) => readFileSync(file, 'utf8')

/** Numero de ligne (base 1) d'une position dans une source. */
export const lineAt = (source, index) => source.slice(0, index).split('\n').length

/**
 * Affiche le resultat d'un controle et rend le code de sortie a propager.
 */
export function report(title, violations) {
  if (violations.length === 0) {
    console.log(`✓ ${title}`)
    return 0
  }

  console.error(`✗ ${title} — ${violations.length} manquement(s)`)
  for (const violation of violations) console.error(`    ${violation}`)
  console.error('')
  return 1
}

/** Signale sans bloquer : ce qui merite un regard, pas ce qui interdit de pousser. */
export function warn(title, notices) {
  if (notices.length === 0) return
  console.log(`! ${title}`)
  for (const notice of notices) console.log(`    ${notice}`)
}

/**
 * Remplace par des espaces le contenu des commentaires, en preservant les
 * sauts de ligne — donc les numeros de ligne.
 *
 * Sans cela une balise citee dans un commentaire declenche une fausse
 * violation. L'analyse traverse chaines et expressions regulieres sans les
 * effacer : le controle d'isolation a besoin des specificateurs d'import, et
 * les traverser evite qu'un `//` a l'interieur d'une URL avale une vraie ligne
 * de code.
 *
 * Une apostrophe droite dans du texte JSX derouterait l'analyse, mais
 * `react/no-unescaped-entities` — actif via eslint-config-next — l'interdit
 * deja.
 */
export function stripComments(source) {
  const output = [...source]
  let index = 0
  let previous = ''

  const blank = (from, to) => {
    for (let k = from; k < to && k < output.length; k += 1) {
      if (output[k] !== '\n') output[k] = ' '
    }
  }

  while (index < source.length) {
    const char = source[index]
    const pair = source.slice(index, index + 2)

    if (pair === '//') {
      const end = source.indexOf('\n', index)
      const stop = end === -1 ? source.length : end
      blank(index, stop)
      index = stop
      continue
    }

    if (pair === '/*') {
      const end = source.indexOf('*/', index + 2)
      const stop = end === -1 ? source.length : end + 2
      blank(index, stop)
      index = stop
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      index = endOfLiteral(source, index, char)
      previous = char
      continue
    }

    if (char === '/' && opensRegex(previous)) {
      index = endOfLiteral(source, index, '/')
      previous = '/'
      continue
    }

    if (!/\s/.test(char)) previous = char
    index += 1
  }

  return output.join('')
}

/** Position juste apres le litteral ouvert a `start` par le delimiteur `quote`. */
function endOfLiteral(source, start, quote) {
  let index = start + 1
  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2
      continue
    }
    if (source[index] === quote) return index + 1
    // Une chaine simple ne franchit pas la ligne : au-dela, c'est que le
    // delimiteur n'en etait pas un (apostrophe de texte, division).
    if (quote !== '`' && source[index] === '\n') return index
    index += 1
  }
  return source.length
}

/**
 * Un `/` ouvre une expression reguliere plutot qu'une division selon ce qui le
 * precede. Heuristique usuelle, suffisante hors code volontairement tordu.
 */
const opensRegex = (previous) => previous === '' || '(,=:[!&|?{};+-*%~^<>'.includes(previous)
