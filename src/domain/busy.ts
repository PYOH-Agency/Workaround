export interface BusyInterval {
  from: Date
  to: Date
}

/**
 * L'etat de l'agenda externe, en TROIS valeurs distinctes.
 *
 * `unreadable` n'est pas `connected` avec un tableau vide, et ce n'est pas un
 * detail de style : rendre `BusyInterval[]` et laisser `[]` signifier les deux
 * ferait afficher « libre » au premier incident reseau, et l'artisan se
 * doublerait un rendez-vous.
 *
 * Le compilateur oblige a traiter les trois cas. C'est la meme discipline que
 * le couple taux-volume de M5 : la regle est portee par le type, pas par la
 * revue.
 */
export type BusyState =
  | { kind: 'connected'; intervals: BusyInterval[] }
  | { kind: 'unreadable' }
  | { kind: 'unlinked' }

/**
 * Fusionne les intervalles qui se touchent ou se chevauchent.
 *
 * Deux agendas raccordes, ou un agenda ou une reunion en prolonge une autre,
 * produisent des intervalles contigus. Les afficher separement ferait lire
 * « occupe 9h-10h, occupe 10h-11h » la ou il faut lire « occupe 9h-11h ».
 */
export function mergeBusy(intervals: BusyInterval[]): BusyInterval[] {
  const sorted = [...intervals].sort((a, b) => a.from.getTime() - b.from.getTime())
  const merged: BusyInterval[] = []

  for (const interval of sorted) {
    const last = merged.at(-1)

    // `<=` et non `<` : deux intervalles qui se touchent n'en font qu'un.
    if (last && interval.from.getTime() <= last.to.getTime()) {
      if (interval.to.getTime() > last.to.getTime()) last.to = interval.to
      continue
    }

    merged.push({ from: interval.from, to: interval.to })
  }

  return merged
}
