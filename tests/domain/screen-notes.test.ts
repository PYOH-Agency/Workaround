import { existsSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { SCREEN_NOTES, type ScreenNoteKey } from '@/domain/screen-notes'

const entries = Object.entries(SCREEN_NOTES) as [ScreenNoteKey, (typeof SCREEN_NOTES)[ScreenNoteKey]][]

/** Le dossier de routes du public concerne — c'est tout ce qui separe les deux. */
const GROUP = { company: '(app)', requester: '(espace)' } as const

describe('le catalogue des notices d’ecran', () => {
  it('couvre les six ecrans de la spec, et l’accueil n’en est pas', () => {
    // L'accueil se presente de lui-meme, et sa mise en route dit deja quoi
    // faire (spec A2 §4). Lui poser une carte doublerait ce qu'il porte.
    expect(Object.keys(SCREEN_NOTES).sort()).toEqual([
      'agenda',
      'devis',
      'mes-logements',
      'mon-passeport',
      'mon-repertoire',
      'verification',
    ])
  })

  it('rend chaque notice joignable par sa cle', () => {
    for (const [key, note] of entries) expect(note.key).toBe(key)
  })

  it('designe par sa cle un ecran qui existe, chez son public', () => {
    // C'est ce qui rend la cle verifiable plutot que declarative : une notice
    // qui presente un ecran disparu se poserait sur rien.
    for (const [key, note] of entries) {
      expect(existsSync(`src/app/${GROUP[note.audience]}/${key}/page.tsx`), key).toBe(true)
    }
  })

  it('tient chaque texte en deux phrases au plus', () => {
    // Deux phrases : ce que fait l'ecran, et le seul geste qui compte. Une
    // troisieme et personne ne lit — la carte redeviendrait le tutoriel que la
    // spec ecarte (§2.1).
    for (const [key, note] of entries) {
      const sentences = note.text.match(/[.!?](?:\s|$)/g) ?? []
      expect(sentences.length, `${key} : « ${note.text} »`).toBeGreaterThanOrEqual(1)
      expect(sentences.length, `${key} : « ${note.text} »`).toBeLessThanOrEqual(2)
    }
  })

  it('ne dit pas deux fois la meme chose', () => {
    const texts = entries.map(([, note]) => note.text)
    expect(new Set(texts).size).toBe(texts.length)
  })
})
