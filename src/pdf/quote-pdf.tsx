import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { format } from '@/domain/money'
import type { PublicQuote } from '@/services/quote-public'

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 9.5, fontFamily: 'Helvetica', color: '#1a1a1a' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  muted: { color: '#666' },
  block: { marginBottom: 20 },
  parties: { flexDirection: 'row', gap: 32, marginBottom: 24 },
  party: { flex: 1 },
  partyTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  head: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 5,
    fontFamily: 'Helvetica-Bold',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
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
    borderTopColor: '#1a1a1a',
    marginTop: 4,
    paddingTop: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  signature: {
    marginTop: 32,
    borderWidth: 0.5,
    borderColor: '#999',
    padding: 14,
    width: 260,
  },
  withdrawal: {
    marginTop: 22,
    borderWidth: 0.5,
    borderColor: '#999',
    padding: 10,
    fontSize: 7.5,
    lineHeight: 1.5,
  },
  insurance: {
    marginTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    paddingTop: 8,
    fontSize: 7.5,
    color: '#555',
    lineHeight: 1.5,
  },
  footer: { position: 'absolute', bottom: 28, left: 44, right: 44, fontSize: 7.5, color: '#888' },
})

const rate = (r: number) => `${(r / 100).toFixed(1).replace('.', ',')} %`

function QuoteDocument({ quote }: { quote: PublicQuote }) {
  return (
    <Document
      title={`Devis ${quote.number}`}
      author={quote.company.legalName}
      subject={`Devis ${quote.number}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.block}>
          <Text style={styles.title}>Devis {quote.number}</Text>
          <Text style={styles.muted}>Émis le {quote.issuedOn}</Text>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyTitle}>
              {quote.company.legalName} — {quote.company.legal.legalFormLabel}
            </Text>
            <Text style={styles.muted}>{quote.company.address}</Text>
            <Text style={styles.muted}>
              {quote.company.legal.phone} · {quote.company.legal.email}
            </Text>
            <Text style={styles.muted}>SIRET {quote.company.siret}</Text>
            <Text style={styles.muted}>{quote.company.legal.registrationNumber}</Text>
            <Text style={styles.muted}>
              {quote.company.legal.vatExempt
                ? 'TVA non applicable, art. 293 B du CGI'
                : `TVA ${quote.company.legal.vatNumber}`}
            </Text>
          </View>
          <View style={styles.party}>
            <Text style={styles.partyTitle}>{quote.customer.name}</Text>
            <Text style={styles.muted}>Chantier :</Text>
            <Text style={styles.muted}>{quote.customer.propertyAddress}</Text>
          </View>
        </View>

        <View style={styles.head}>
          <Text style={styles.colLabel}>Désignation</Text>
          <Text style={styles.col}>Qté</Text>
          <Text style={styles.col}>P.U. HT</Text>
          <Text style={styles.col}>TVA</Text>
          <Text style={styles.col}>Total HT</Text>
        </View>

        {quote.lines.map((line, i) => (
          <View style={styles.row} key={i}>
            <Text style={styles.colLabel}>{line.label}</Text>
            <Text style={styles.col}>
              {line.quantity} {line.unit}
            </Text>
            <Text style={styles.col}>{format(line.unitPriceExclTax)}</Text>
            <Text style={styles.col}>{rate(line.taxRate)}</Text>
            <Text style={styles.col}>
              {format(Math.round(line.unitPriceExclTax * Number(line.quantity)))}
            </Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Total HT</Text>
            <Text>{format(quote.totals.totalExclTax)} €</Text>
          </View>
          {quote.totals.byRate.map((b) => (
            <View style={styles.totalRow} key={b.rate}>
              <Text style={styles.muted}>
                TVA {rate(b.rate)} sur {format(b.baseExclTax)} €
              </Text>
              <Text style={styles.muted}>{format(b.taxAmount)} €</Text>
            </View>
          ))}
          <View style={styles.grandTotal}>
            <Text>Total TTC</Text>
            <Text>{format(quote.totals.totalInclTax)} €</Text>
          </View>
        </View>

        <View style={{ marginTop: 24, lineHeight: 1.6 }}>
          <Text>Validité de la présente offre : {quote.validityDays} jours à compter de son émission.</Text>
          {quote.committedLeadTimeDays !== null && (
            <Text>
              Délai d’exécution engagé : {quote.committedLeadTimeDays} jours ouvrés à compter de
              l’acceptation.
            </Text>
          )}
          <Text>Modalités de paiement : {quote.company.legal.paymentTerms}</Text>
          <Text>
            Travaux couverts par les garanties légales de parfait achèvement, de bon fonctionnement
            et décennale.
          </Text>
        </View>

        <View style={styles.signature}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Bon pour accord</Text>
          <Text style={[styles.muted, { marginTop: 4 }]}>
            Date, nom et signature du client
          </Text>
          <Text style={{ marginTop: 34 }} />
        </View>

        {/*
          Droit de retractation. Un artisan qui fait signer chez son client
          conclut un contrat hors etablissement : omettre cette mention porte le
          delai de retractation de quatorze jours a douze mois.
        */}
        {quote.customer.isIndividual && (
          <View style={styles.withdrawal}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Droit de rétractation</Text>
            <Text>
              Pour un contrat conclu hors établissement, vous disposez d’un délai de quatorze jours
              à compter de son acceptation pour vous rétracter, sans avoir à motiver votre décision.
              Si vous demandez expressément que les travaux commencent avant la fin de ce délai,
              vous restez redevable des prestations déjà réalisées.
            </Text>
          </View>
        )}

        {/*
          Mentions imposees par l'article L243-2 du Code des assurances sur tout
          devis et toute facture du batiment. Leur absence expose l'artisan a
          une amende administrative de 3 000 EUR, 15 000 EUR pour une societe.
        */}
        <View style={styles.insurance}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Assurance professionnelle</Text>
          <Text>
            {quote.company.legal.insurerName} — {quote.company.legal.insurerAddress}
          </Text>
          <Text>Contrat n° {quote.company.legal.policyNumber}</Text>
          <Text>Activités garanties : {quote.company.legal.coveredActivities}</Text>
          <Text>Couverture géographique : {quote.company.legal.coverageArea}</Text>
        </View>

        <Text style={styles.footer} fixed>
          {quote.company.legalName} — SIRET {quote.company.siret}. Devis gratuit et sans engagement.
        </Text>
      </Page>
    </Document>
  )
}

export function renderQuotePdf(quote: PublicQuote): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument quote={quote} />)
}
