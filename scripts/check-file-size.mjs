import { trackedFiles, read, report } from './lib/sources.mjs'

/**
 * Un fichier qu'on ne lit plus d'un seul tenant cache ses propres defauts : on
 * y ajoute par peur d'y toucher, et deux responsabilites finissent par y
 * cohabiter sans que personne l'ait decide.
 */
const LIMIT = 250

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.mjs', '.css']

function countLines(source) {
  const lines = source.split('\n')
  return lines.at(-1) === '' ? lines.length - 1 : lines.length
}

const violations = trackedFiles(EXTENSIONS)
  .map((file) => ({ file, lines: countLines(read(file)) }))
  .filter(({ lines }) => lines > LIMIT)
  .sort((a, b) => b.lines - a.lines)
  .map(({ file, lines }) => `${file} — ${lines} lignes (limite ${LIMIT})`)

process.exit(report(`Taille des fichiers (max ${LIMIT} lignes)`, violations))
