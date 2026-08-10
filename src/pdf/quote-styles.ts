import { StyleSheet } from '@react-pdf/renderer'
import { pdf, pdfFont } from './tokens'

/**
 * La feuille de style du devis.
 *
 * Sortie de `quote-pdf.tsx` quand celui-ci a franchi les 250 lignes : le
 * document et son habillage n'ont pas la meme raison de changer, et c'est
 * l'habillage qui occupait le tiers du fichier.
 */

export const bold = { fontFamily: pdfFont.display, fontWeight: 700 } as const

export const styles = StyleSheet.create({
  page: {
    padding: 44,
    fontSize: 9.5,
    fontFamily: pdfFont.body,
    color: pdf.ink,
    backgroundColor: pdf.paper,
  },
  title: { fontSize: 18, fontFamily: pdfFont.display, fontWeight: 800, letterSpacing: -0.4 },
  muted: { color: pdf.muted },
  block: { marginBottom: 20 },
  parties: { flexDirection: 'row', gap: 32, marginBottom: 24 },
  party: { flex: 1 },
  partyTitle: { ...bold, marginBottom: 4 },
  head: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: pdf.ink,
    paddingBottom: 5,
    ...bold,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: pdf.rule,
    paddingVertical: 5,
  },
  colLabel: { flex: 5 },
  col: { flex: 1.4, textAlign: 'right' },
  totals: { marginTop: 18, marginLeft: 'auto', width: 240 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: pdf.ink,
    marginTop: 4,
    paddingTop: 4,
    ...bold,
    fontSize: 11,
  },
  signature: {
    marginTop: 32,
    borderWidth: 0.5,
    borderColor: pdf.field,
    padding: 14,
    width: 260,
  },
  withdrawal: {
    marginTop: 22,
    borderWidth: 0.5,
    borderColor: pdf.field,
    padding: 10,
    fontSize: 7.5,
    lineHeight: 1.5,
  },
  insurance: {
    marginTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: pdf.rule,
    paddingTop: 8,
    fontSize: 7.5,
    color: pdf.soft,
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 44,
    right: 44,
    fontSize: 7.5,
    color: pdf.muted,
  },
})
