import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { format } from '@/domain/money'
import type { PublicInvoice } from '@/services/invoice-public'

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
  due: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    fontFamily: 'Helvetica-Bold',
  },
  penalties: {
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

export const TYPE_LABELS: Record<PublicInvoice['type'], string> = {
  deposit: 'Facture d’acompte',
  progress: 'Situation de travaux',
  balance: 'Facture de solde',
  credit_note: 'Avoir',
}

function InvoiceDocument({ invoice }: { invoice: PublicInvoice }) {
  const title = `${TYPE_LABELS[invoice.type]} ${invoice.number}`

  return (
    <Document title={title} author={invoice.company.legalName} subject={title}>
      <Page size="A4" style={styles.page}>
        <View style={styles.block}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.muted}>
            Émise le {invoice.issuedOn} · Échéance le {invoice.dueOn}
          </Text>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyTitle}>
              {invoice.company.legalName} — {invoice.company.legal.legalFormLabel}
            </Text>
            <Text style={styles.muted}>{invoice.company.address}</Text>
            <Text style={styles.muted}>
              {invoice.company.legal.phone} · {invoice.company.legal.email}
            </Text>
            <Text style={styles.muted}>SIRET {invoice.company.siret}</Text>
            <Text style={styles.muted}>{invoice.company.legal.registrationNumber}</Text>
            <Text style={styles.muted}>
              {invoice.company.legal.vatExempt
                ? 'TVA non applicable, art. 293 B du CGI'
                : `TVA ${invoice.company.legal.vatNumber}`}
            </Text>
          </View>
          <View style={styles.party}>
            <Text style={styles.partyTitle}>{invoice.customer.name}</Text>
            {/* Exige par la facturation electronique entre professionnels. */}
            {invoice.customer.siret && (
              <Text style={styles.muted}>SIRET {invoice.customer.siret}</Text>
            )}
            <Text style={styles.muted}>Chantier :</Text>
            <Text style={styles.muted}>{invoice.customer.propertyAddress}</Text>
          </View>
        </View>

        <View style={styles.head}>
          <Text style={styles.colLabel}>Désignation</Text>
          <Text style={styles.col}>Qté</Text>
          <Text style={styles.col}>P.U. HT</Text>
          <Text style={styles.col}>TVA</Text>
          <Text style={styles.col}>Total HT</Text>
        </View>

        {invoice.lines.map((line, i) => (
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
            <Text>{format(invoice.totals.totalExclTax)} €</Text>
          </View>
          {invoice.totals.byRate.map((b) => (
            <View style={styles.totalRow} key={b.rate}>
              <Text style={styles.muted}>
                TVA {rate(b.rate)} sur {format(b.baseExclTax)} €
              </Text>
              <Text style={styles.muted}>{format(b.taxAmount)} €</Text>
            </View>
          ))}
          <View style={styles.grandTotal}>
            <Text>Total TTC</Text>
            <Text>{format(invoice.totals.totalInclTax)} €</Text>
          </View>
          <View style={styles.due}>
            <Text>Reste dû</Text>
            <Text>{format(invoice.outstandingInclTax)} €</Text>
          </View>
        </View>

        <View style={{ marginTop: 24, lineHeight: 1.6 }}>
          <Text>Date d’échéance du paiement : {invoice.dueOn}.</Text>
          <Text>Modalités de paiement : {invoice.company.legal.paymentTerms}</Text>
        </View>

        {/*
          Mentions dues entre professionnels (art. L441-9 et D441-5 du Code de
          commerce). Chaque mention manquante coute 15 EUR, plafonnees a 25 % du
          montant de la facture : sur un chantier a 8 000 EUR, l'addition
          atteint 2 000 EUR.
        */}
        {!invoice.customer.isIndividual && (
          <View style={styles.penalties}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Retard de paiement</Text>
            <Text>
              En cas de retard de paiement, des pénalités au taux de {invoice.latePaymentRate} sont
              exigibles dès le jour suivant la date d’échéance, sans qu’un rappel soit nécessaire,
              ainsi qu’une indemnité forfaitaire pour frais de recouvrement de{' '}
              {format(invoice.recoveryIndemnity)} €.
            </Text>
          </View>
        )}

        {/*
          La retenue de garantie — loi n° 71-584 du 16 juillet 1971.
          Le document imprime la REGLE, jamais une date qu'on ignore : sans
          reception declaree, annoncer une echeance serait inventer un fait.
        */}
        {invoice.retention.amount > 0 && (
          <View style={styles.penalties}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Retenue de garantie</Text>
            <Text>
              Conformément à la loi n° 71-584 du 16 juillet 1971 et au devis, une retenue de{' '}
              {format(invoice.retention.amount)} € peut être prélevée sur le règlement de la
              présente facture. Cette somme est consignée par le maître d’ouvrage auprès d’un tiers
              convenu entre les parties, et restituée un an après la réception des travaux
              {invoice.retention.releasesOn
                ? `, soit le ${invoice.retention.releasesOn.toLocaleDateString('fr-FR')}`
                : ''}
              . Montant à régler à ce jour : {format(invoice.dueNowInclTax)} €.
            </Text>
          </View>
        )}

        {/*
          Mentions imposees par l'article L243-2 du Code des assurances sur tout
          devis et toute facture du batiment.
        */}
        <View style={styles.insurance}>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>Assurance professionnelle</Text>
          <Text>
            {invoice.company.legal.insurerName} — {invoice.company.legal.insurerAddress}
          </Text>
          <Text>Contrat n° {invoice.company.legal.policyNumber}</Text>
          <Text>Activités garanties : {invoice.company.legal.coveredActivities}</Text>
          <Text>Couverture géographique : {invoice.company.legal.coverageArea}</Text>
          {/* Les quatre lignes ci-dessus sont declaratives ; celle-ci mene au controle. */}
          {invoice.company.passportUrl && (
            <Text>Vérifier ces garanties : {invoice.company.passportUrl}</Text>
          )}
        </View>

        <Text style={styles.footer} fixed>
          {invoice.company.legalName} — SIRET {invoice.company.siret}.
        </Text>
      </Page>
    </Document>
  )
}

export function renderInvoicePdf(invoice: PublicInvoice): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />)
}
