import { describe, it, expect } from 'vitest'
import { detectSilentSources, type SourceState } from '@/domain/detectors/sources'

const NOW = new Date('2026-08-08T10:00:00Z')

const state = (overrides: Partial<SourceState> = {}): SourceState => ({
  source: 'bodacc',
  lastCheckedAt: new Date('2026-08-08T07:00:00Z'),
  ...overrides,
})

describe('source devenue muette', () => {
  it('ne signale rien quand la source a repondu recemment', () => {
    expect(detectSilentSources([state()], NOW, 1)).toEqual([])
  })

  it('signale au-dela de 48 heures', () => {
    const found = detectSilentSources([state({ lastCheckedAt: new Date('2026-08-05T07:00:00Z') })], NOW, 1)

    expect(found).toHaveLength(1)
    // Bloquant : la verification s'est arretee, et en silence.
    expect(found[0].severity).toBe('blocking')
    expect(found[0].detail).toContain('bodacc')
  })

  it('signale une source jamais interrogee', () => {
    const found = detectSilentSources(
      [state({ lastCheckedAt: null, since: new Date('2026-07-01') })],
      NOW,
      1,
    )
    expect(found).toHaveLength(1)
  })

  it('ne signale rien quand il n y a aucune entreprise a controler', () => {
    // LA garde qui evite un faux positif au tout premier lancement. Un outil
    // qui crie au loup le jour de sa mise en service est ignore pour toujours.
    expect(detectSilentSources([state({ lastCheckedAt: null })], NOW, 0)).toEqual([])
  })
})
