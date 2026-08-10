import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import { format } from '@/domain/money'
import { retainedAmount } from '@/domain/retention'
import type { PublicQuote } from '@/services/quote-public'
import { registerBrandFonts } from './fonts'
import { bold, styles } from './quote-styles'

registerBrandFonts()

/** Un montant : le symbole est pose ici, une seule fois, pour tout le document. */
const euro = (cents: number) => `${format(cents)} €`

/** Le taux est en centiemes de pourcent : 2000 => « 20,0 % ». */
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
            <Text>{euro(quote.totals.totalExclTax)}</Text>
          </View>
          {quote.totals.byRate.map((b) => (
            <View style={styles.totalRow} key={b.rate}>
              <Text style={styles.muted}>
                TVA {rate(b.rate)} sur {euro(b.baseExclTax)}
              </Text>
              <Text style={styles.muted}>{euro(b.taxAmount)}</Text>
            </View>
          ))}
          <View style={styles.grandTotal}>
            <Text>Total TTC</Text>
            <Text>{euro(quote.totals.totalInclTax)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 24, lineHeight: 1.6 }}>
          <Text>
            Validité de la présente offre : {quote.validityDays} jours à compter de son émission.
          </Text>
          {quote.committedLeadTimeDays !== null && (
            <Text>
              Délai d’exécution engagé : {quote.committedLeadTimeDays} jours ouvrés à compter de
              l’acceptation.
            </Text>
          )}
          <Text>Modalités de paiement : {quote.company.legal.paymentTerms}</Text>
          {/*
            La stipulation doit figurer AU DEVIS : c'est le contrat. Une retenue
            appliquee sans stipulation ecrite est une amputation illegale du
            paiement de l'artisan.
          */}
          {quote.retentionRate > 0 && (
            <Text>
              Retenue de garantie de {quote.retentionRate} % (loi n° 71-584 du 16 juillet 1971),
              soit {euro(retainedAmount(quote.totals.totalInclTax, quote.retentionRate))}. Cette
              somme est consignée par le maître d’ouvrage auprès d’un tiers convenu entre les
              parties, et lui est restituée un an après la réception des travaux.
            </Text>
          )}
          <Text>
            Travaux couverts par les garanties légales de parfait achèvement, de bon fonctionnement
            et décennale.
          </Text>
        </View>

        <View style={styles.signature}>
          <Text style={bold}>Bon pour accord</Text>
          <Text style={[styles.muted, { marginTop: 4 }]}>Date, nom et signature du client</Text>
          <Text style={{ marginTop: 34 }} />
        </View>

        {/*
          Droit de retractation. Un artisan qui fait signer chez son client
          conclut un contrat hors etablissement : omettre cette mention porte le
          delai de retractation de quatorze jours a douze mois.
        */}
        {quote.customer.isIndividual && (
          <View style={styles.withdrawal}>
            <Text style={bold}>Droit de rétractation</Text>
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
          <Text style={bold}>Assurance professionnelle</Text>
          <Text>
            {quote.company.legal.insurerName} — {quote.company.legal.insurerAddress}
          </Text>
          <Text>Contrat n° {quote.company.legal.policyNumber}</Text>
          <Text>Activités garanties : {quote.company.legal.coveredActivities}</Text>
          <Text>Couverture géographique : {quote.company.legal.coverageArea}</Text>
          {/*
            Ces quatre lignes sont declaratives : l'artisan les a saisies. La
            cinquieme mene a ce que nous avons controle, activite par activite,
            avec les echeances. C'est le seul endroit du document ou le lecteur
            se demande deja si l'assurance est reelle.
          */}
          {quote.company.passportUrl && (
            <Text>Vérifier ces garanties : {quote.company.passportUrl}</Text>
          )}
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
